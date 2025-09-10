import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper as MuiPaper,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { Edit, Visibility, Close } from "@mui/icons-material";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { supabase } from "../lib/supabase";

const PRICE_RANGES = [
  { label: "Below 700 per person", value: 700 },
  { label: "Below 1500", value: 1500 },
  { label: "Below 2500", value: 2500 },
  { label: "Above 2500", value: 2501 },
];

const HOTEL_CONFIG = {
  700: {
    categories: ["Any"],
    roomTypes: ["Dorms", "Guest House"],
    addOns: ["Multiple", "Extra Bed", "Dinner", "Breakfast", "Lunch"],
  },
  1500: {
    categories: ["2 Star"],
    roomTypes: ["Economy Villas"],
    addOns: ["Multiple", "Dinner", "Lunch", "Breakfast"],
  },
  2500: {
    categories: ["Up to 4 Star"],
    roomTypes: ["Premium Villas"],
    addOns: ["Multiple", "Dinner", "Lunch", "Breakfast"],
  },
  2501: {
    categories: ["Up to 5 Star"],
    roomTypes: ["Executive Suites", "Villas"],
    addOns: ["Multiple", "Dinner", "Lunch", "Breakfast"],
  },
};

const GOOGLE_MAPS_API_KEY = "AIzaSyA0qsyU5sKAdS_k2g44Nqv5cUjKY8I1zvI"; // Put your API key here

async function fetchZoneClusterFromLatLng(lat, lng) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    if (data.status !== "OK" || !data.results.length)
      return { zone: "", cluster: "" };
    let zone = "";
    let cluster = "";
    for (const result of data.results) {
      const components = result.address_components;
      if (!zone) {
        const st = components.find((c) =>
          c.types.includes("administrative_area_level_1")
        );
        if (st) zone = st.long_name;
      }
      if (!cluster) {
        let districtComp = components.find((c) =>
          c.types.includes("administrative_area_level_2")
        );
        if (!districtComp) {
          districtComp =
            components.find((c) => c.types.includes("sublocality_level_1")) ||
            components.find((c) => c.types.includes("locality"));
        }
        if (districtComp) cluster = districtComp.long_name;
      }
      if (zone && cluster) break;
    }
    return { zone, cluster };
  } catch {
    return { zone: "", cluster: "" };
  }
}

function PlacesAutocompleteInput({ label, value, onChange, placeholder }) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    defaultValue: value,
    requestOptions: { types: ["geocode"] },
  });

  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    if (value && value !== inputValue) setValue(value, false);
  }, [value, inputValue, setValue]);

  const handleInput = (e) => {
    setValue(e.target.value);
    setOpen(true);
  };

  const handleSelect = (val) => {
    setValue(val, false);
    onChange(val);
    setOpen(false);
    clearSuggestions();
  };

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        label={label}
        value={inputValue || ""}
        onChange={handleInput}
        disabled={!ready}
        fullWidth
        placeholder={placeholder}
        autoComplete="off"
      />
      {status === "OK" && open && (
        <MuiPaper
          sx={{
            position: "absolute",
            zIndex: 1100,
            width: "100%",
            maxHeight: 250,
            overflowY: "auto",
          }}
        >
          <List dense>
            {data.map(({ place_id, description }) => (
              <ListItem key={place_id} disablePadding>
                <ListItemButton onClick={() => handleSelect(description)}>
                  <ListItemText primary={description} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </MuiPaper>
      )}
    </Box>
  );
}

function calculateDurationHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "";
  const [h1, m1] = checkIn.split(":").map(Number);
  const [h2, m2] = checkOut.split(":").map(Number);
  let diff = h2 + m2 / 60 - (h1 + m1 / 60);
  if (diff <= 0) diff += 24;
  return diff.toFixed(1);
}

export default function HotelsAdmin() {
  const [hotels, setHotels] = React.useState([]);
  const [routes, setRoutes] = React.useState([]);
  const [selectedRouteId, setSelectedRouteId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [zoneError, setZoneError] = React.useState("");
  const [locationCoords, setLocationCoords] = React.useState(null);
  const [previewHotel, setPreviewHotel] = React.useState(null);
  const [editHotel, setEditHotel] = React.useState(null);
  const [locationLatLng, setLocationLatLng] = useState(null);

  const [form, setForm] = React.useState({
    id: null,
    route_id: "",
    hotel_name: "",
    location: "",
    zone: "",
    cluster: "",
    gallery_urls: [],
    comment: "",
    food: false,
    rating: "",
    capacity: "",
    max_price_per_room: "",
    manual_price: "",
    hotel_category: "",
    room_type: "",
    service: "",
    add_ons: [],
    notes: "",
    opening_hours: null,
    check_in_time: "",
    check_out_time: "",
    stay_duration_hours: "",
    stay_duration_desc: "",
    extra_bed_available: "",
  });

  React.useEffect(() => {
    fetchRoutes();
    fetchHotels();
  }, []);

  async function fetchRoutes() {
    const { data } = await supabase.from("routes").select("id, name");
    setRoutes(data || []);
  }

  async function fetchHotels() {
    setLoading(true);
    const { data } = await supabase
      .from("hotels_model")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      data.forEach((h) => {
        if (typeof h.gallery_urls === "string") {
          try {
            h.gallery_urls = JSON.parse(h.gallery_urls);
          } catch {
            h.gallery_urls = [];
          }
        }
      });
    }
    setHotels(data || []);
    setLoading(false);
  }

  function setField(field, value) {
    if (field === "check_in_time" || field === "check_out_time") {
      const newForm = { ...form, [field]: value };
      const duration = calculateDurationHours(
        newForm.check_in_time,
        newForm.check_out_time
      );
      const desc =
        duration && newForm.check_in_time && newForm.check_out_time
          ? `${newForm.check_in_time} - ${newForm.check_out_time} (${duration}h)`
          : "";
      setForm({
        ...newForm,
        stay_duration_hours: duration,
        stay_duration_desc: desc,
      });
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  }

  async function onLocationChange(val) {
    setZoneError("");
    if (!val || typeof val !== "string") return;
    try {
      const geocodeResults = await getGeocode({ address: val });
      if (!geocodeResults.length) {
        setZoneError("No results found for location");
        setForm((prev) => ({ ...prev, zone: "", cluster: "" }));
        return;
      }
      const { lat, lng } = await getLatLng(geocodeResults[0]);
      setLocationLatLng({ lat, lng });

      const { zone, cluster } = await fetchZoneClusterFromLatLng(
        lat,
        lng,
        GOOGLE_MAPS_API_KEY
      );

      setForm((prev) => ({
        ...prev,
        zone,
        cluster,
      }));

      if (!zone || !cluster) {
        setZoneError("Could not determine zone or cluster for this location");
      }
    } catch (err) {
      setZoneError("Error checking location: " + err.message);
      setForm((prev) => ({ ...prev, zone: "", cluster: "" }));
      setLocationLatLng(null);
    }
  }

  async function uploadImage(file) {
    const ext = file.name.split(".").pop();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `hotels/${filename}`;
    const { error } = await supabase.storage.from("hotels").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("hotels").getPublicUrl(path);
    return data.publicUrl;
  }

  async function addImages(files) {
    if (!form.hotel_name.trim()) {
      alert("Please enter hotel name first.");
      return;
    }
    const newImages = [];
    for (const file of files) {
      newImages.push({ url: URL.createObjectURL(file), file });
    }
    setForm((prev) => ({
      ...prev,
      gallery_urls: [...prev.gallery_urls, ...newImages].slice(0, 5),
    }));

    for (const img of newImages) {
      try {
        const url = await uploadImage(img.file);
        setForm((prev) => ({
          ...prev,
          gallery_urls: prev.gallery_urls.map((g) =>
            g.url === img.url ? { url, file: null } : g
          ),
        }));
      } catch {}
    }
  }

  function removeImage(index) {
    setForm((prev) => ({
      ...prev,
      gallery_urls: prev.gallery_urls.filter((_, i) => i !== index),
    }));
  }

  async function saveHotel() {
    if (
      !form.route_id ||
      !form.hotel_name ||
      !form.location ||
      !form.zone ||
      !form.cluster ||
      zoneError
    ) {
      alert("Please fill all required fields and fix any errors.");
      return;
    }
    setSaving(true);
    try {
      const galleryUrls = form.gallery_urls.map((g) => g.url);
      const payload = {
        route_id: form.route_id,
        hotel_name: form.hotel_name,
        location: form.location,
        zone: form.zone,
        cluster: form.cluster,
        gallery_urls: galleryUrls.length ? galleryUrls : null,
        comment: form.comment || null,
        food: form.food,
        rating: form.rating || null,
        capacity: form.capacity || null,
        max_price_per_room:
          form.max_price_per_room === ""
            ? null
            : parseInt(form.max_price_per_room),
        manual_price: form.manual_price ? parseFloat(form.manual_price) : null,
        hotel_category: form.hotel_category || null,
        room_type: form.room_type || null,
        service: form.service || null,
        add_ons: form.add_ons.length ? form.add_ons : null,
        notes: form.notes || null,
        opening_hours: form.opening_hours || null,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        stay_duration_hours: form.stay_duration_hours
          ? parseFloat(form.stay_duration_hours)
          : null,
        stay_duration_desc: form.stay_duration_desc || null,
        extra_bed_available: form.extra_bed_available
          ? parseInt(form.extra_bed_available)
          : null,
      };
      if (form.id) {
        const { error } = await supabase
          .from("hotels_model")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        alert("Hotel updated successfully.");
      } else {
        const { error } = await supabase.from("hotels_model").insert(payload);
        if (error) throw error;
        alert("Hotel added successfully.");
      }
      resetForm();
      setAddOpen(false);
      setEditHotel(null);
      fetchHotels();
    } catch (e) {
      alert(`Error saving hotel: ${e.message}`);
    }
    setSaving(false);
  }

  function resetForm() {
    setForm({
      id: null,
      route_id: "",
      hotel_name: "",
      location: "",
      zone: "",
      cluster: "",
      gallery_urls: [],
      comment: "",
      food: false,
      rating: "",
      capacity: "",
      max_price_per_room: "",
      manual_price: "",
      hotel_category: "",
      room_type: "",
      service: "",
      add_ons: [],
      notes: "",
      opening_hours: null,
      check_in_time: "",
      check_out_time: "",
      stay_duration_hours: "",
      stay_duration_desc: "",
      extra_bed_available: "",
    });
    setZoneError("");
    setLocationCoords(null);
    setLocationLatLng(null);
    setSelectedRouteId("");
  }

  function editHotelFunction(hotel) {
    const categories = HOTEL_CONFIG[hotel.max_price_per_room]?.categories || [];
    const roomTypes = HOTEL_CONFIG[hotel.max_price_per_room]?.roomTypes || [];

    const maxPriceVal =
      hotel.max_price_per_room !== null &&
      hotel.max_price_per_room !== undefined
        ? hotel.max_price_per_room.toString()
        : "";

    const hotelCategoryVal = categories.includes(hotel.hotel_category)
      ? hotel.hotel_category
      : "";
    const roomTypeVal = roomTypes.includes(hotel.room_type)
      ? hotel.room_type
      : "";

    setEditHotel(hotel);
    setForm({
      id: hotel.id,
      route_id: hotel.route_id || "",
      hotel_name: hotel.hotel_name || "",
      location: hotel.location || "",
      zone: hotel.zone || "",
      cluster: hotel.cluster || "",
      gallery_urls: hotel.gallery_urls
        ? hotel.gallery_urls.map((url) => ({ url, file: null }))
        : [],
      comment: hotel.comment || "",
      food: hotel.food || false,
      rating: hotel.rating ? hotel.rating.toString() : "",
      capacity: hotel.capacity ? hotel.capacity.toString() : "",
      max_price_per_room: maxPriceVal,
      manual_price: hotel.manual_price ? hotel.manual_price.toString() : "",
      hotel_category: hotelCategoryVal,
      room_type: roomTypeVal,
      service: hotel.service || "",
      add_ons: Array.isArray(hotel.add_ons) ? hotel.add_ons : [],
      notes: hotel.notes || "",
      opening_hours: hotel.opening_hours || null,
      check_in_time: hotel.check_in_time || "",
      check_out_time: hotel.check_out_time || "",
      stay_duration_hours: hotel.stay_duration_hours
        ? hotel.stay_duration_hours.toString()
        : "",
      stay_duration_desc: hotel.stay_duration_desc || "",
      extra_bed_available: hotel.extra_bed_available
        ? hotel.extra_bed_available.toString()
        : "",
    });
    setSelectedRouteId(hotel.route_id || "");
    setAddOpen(true);
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <div style={{display:"flex" , justifyContent:"space-between"}}>
        <Typography variant="h5" gutterBottom>
          Hotels Admin Panel
        </Typography>

        {!addOpen && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setEditHotel(null);
              setAddOpen(true);
            }}
            sx={{ mb: 2 }}
          >
            Add Hotel
          </Button>
        )}
      </div>

      {addOpen && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {editHotel ? "Edit Hotel" : "Add Hotel"}
          </Typography>

          <Box
            component="form"
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            }}
          >
            <FormControl fullWidth required>
              <InputLabel>Route</InputLabel>
              <Select
                value={selectedRouteId || ""}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setField("route_id", e.target.value);
                }}
                label="Route"
                required
              >
                {routes.map((route) => (
                  <MenuItem key={route.id} value={route.id}>
                    {route.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <PlacesAutocompleteInput
              label="Hotel Location"
              value={form.hotel_location}
              onChange={onLocationChange}
              placeholder="Search location"
            />

            {zoneError && <Typography color="error">{zoneError}</Typography>}

            <TextField
              label="Zone"
              value={form.zone || ""}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Cluster"
              value={form.cluster || ""}
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Hotel Name"
              value={form.hotel_name}
              onChange={(e) => setField("hotel_name", e.target.value)}
              required
            />

            <TextField
              label="Rating"
              value={form.rating}
              onChange={(e) => setField("rating", e.target.value)}
              type="number"
            />

            <TextField
              label="Capacity"
              value={form.capacity}
              onChange={(e) => setField("capacity", e.target.value)}
              type="number"
            />
            <TextField
              label="Location"
              value={form.location || ""}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, location: val }));
              }}
              placeholder="Enter hotel location"
            />

            <TextField
              label="Contact"
              value={form.service}
              onChange={(e) => setField("service", e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Price Range</InputLabel>
              <Select
                value={form.max_price_per_room || ""}
                onChange={(e) => {
                  setField("max_price_per_room", e.target.value);
                  setField("manual_price", "");
                }}
              >
                {PRICE_RANGES.map((pr) => (
                  <MenuItem key={pr.value} value={pr.value}>
                    {pr.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {form.max_price_per_room && (
              <TextField
                label="Manual Price"
                type="number"
                value={form.manual_price}
                onChange={(e) => setField("manual_price", e.target.value)}
                fullWidth
                sx={{ mt: 1 }}
              />
            )}

            <FormControl fullWidth disabled={!form.max_price_per_room}>
              <InputLabel>Category</InputLabel>
              <Select
                value={
                  HOTEL_CONFIG[form.max_price_per_room]?.categories.includes(
                    form.hotel_category
                  )
                    ? form.hotel_category
                    : ""
                }
                onChange={(e) => setField("hotel_category", e.target.value)}
                label="Category"
              >
                {(HOTEL_CONFIG[form.max_price_per_room]?.categories || []).map(
                  (cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!form.max_price_per_room}>
              <InputLabel>Room Type</InputLabel>
              <Select
                value={
                  HOTEL_CONFIG[form.max_price_per_room]?.roomTypes.includes(
                    form.room_type
                  )
                    ? form.room_type
                    : ""
                }
                onChange={(e) => setField("room_type", e.target.value)}
                label="Room Type"
              >
                {(HOTEL_CONFIG[form.max_price_per_room]?.roomTypes || []).map(
                  (rt) => (
                    <MenuItem key={rt} value={rt}>
                      {rt}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.food}
                    onChange={(e) => setField("food", e.target.checked)}
                  />
                }
                label="Food Available"
              />
            </FormGroup>

            <Box>
              <Typography sx={{ fontWeight: "bold" }}>Add Ons</Typography>
              <FormGroup row>
                {(HOTEL_CONFIG[form.max_price_per_room]?.addOns || []).map(
                  (addon) => (
                    <FormControlLabel
                      key={addon}
                      control={
                        <Checkbox
                          checked={form.add_ons.includes(addon)}
                          onChange={() => {
                            const newAddOns = form.add_ons.includes(addon)
                              ? form.add_ons.filter((a) => a !== addon)
                              : [...form.add_ons, addon];
                            setField("add_ons", newAddOns);
                            if (addon !== "Multiple") return;
                            if (!newAddOns.includes("Multiple")) {
                              setField("extra_bed_available", "");
                            }
                          }}
                        />
                      }
                      label={addon}
                    />
                  )
                )}
                {form.add_ons.includes("Multiple") && (
                  <TextField
                    label="Extra Beds"
                    value={form.extra_bed_available}
                    onChange={(e) =>
                      setField("extra_bed_available", e.target.value)
                    }
                    type="number"
                    sx={{ ml: 1, width: 150 }}
                  />
                )}
              </FormGroup>
            </Box>

            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              multiline
              rows={2}
            />

            <TextField
              label="Check In Time"
              type="time"
              value={form.check_in_time}
              onChange={(e) => setField("check_in_time", e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              fullWidth
              sx={{ mt: 2 }}
            />

            <TextField
              label="Check-out Time"
              type="time"
              value={form.check_out_time}
              onChange={(e) => setField("check_out_time", e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              fullWidth
              sx={{ mt: 2 }}
            />

            <TextField
              label="Stay Duration (hrs)"
              value={form.stay_duration_hours}
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Duration Description"
              value={form.stay_duration_desc}
              InputProps={{ readOnly: true }}
            />

            <Box>
              <Button
                variant="outlined"
                disabled={form.gallery_urls.length >= 5}
                component="label"
              >
                Upload Images
                <input
                  hidden
                  multiple
                  accept="image/*"
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files).slice(
                      0,
                      5 - form.gallery_urls.length
                    );
                    addImages(files);
                    e.target.value = null;
                  }}
                />
              </Button>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                {form.gallery_urls.map((img, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: "relative",
                      width: 100,
                      height: 100,
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={img.url || img}
                      alt={`img-${idx}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(idx)}
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "rgba(0,0,0,0.5)",
                        color: "white",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <Button
                onClick={() => {
                  setAddOpen(false);
                  setEditHotel(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button variant="contained" onClick={saveHotel} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                {/* <TableCell>Location</TableCell> */}
                <TableCell>Room Type</TableCell>
                <TableCell>Manual Price</TableCell>
                {/* <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Extra Beds</TableCell> */}
                <TableCell>Service</TableCell>
                {/* <TableCell>Add Ons</TableCell> */}
                <TableCell>Gallery</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell>{hotel.hotel_name}</TableCell>
                  {/* <TableCell>{hotel.location}</TableCell> */}
                  <TableCell>{hotel.room_type}</TableCell>
                  <TableCell>{hotel.manual_price}</TableCell>
                  {/* <TableCell>{hotel.check_in_time}</TableCell>
                  <TableCell>{hotel.check_out_time}</TableCell>
                  <TableCell>{hotel.extra_bed_available}</TableCell> */}
                  <TableCell>{hotel.service}</TableCell>
                  {/* <TableCell>
                    {hotel.add_ons?.map((a, i) => (
                      <Chip key={i} label={a} size="small" sx={{ mr: 0.5 }} />
                    ))}
                  </TableCell> */}
                  <TableCell>
                    {(hotel.gallery_urls || []).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`gallery-${i}`}
                        width={40}
                        height={40}
                        style={{ marginRight: 4, borderRadius: 4 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => editHotelFunction(hotel)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Preview">
                      <IconButton
                      size="small"
                        color="success"
                        onClick={() => setPreviewHotel(hotel)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                      size="small"
                        color="error"
                        onClick={() => {
                          if (window.confirm("Delete this hotel?")) {
                            supabase
                              .from("hotels_model")
                              .delete()
                              .eq("id", hotel.id)
                              .then(({ error }) => {
                                if (error) alert(error.message);
                                else
                                  setHotels(
                                    hotels.filter((h) => h.id !== hotel.id)
                                  );
                              });
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={Boolean(previewHotel)}
        onClose={() => setPreviewHotel(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{previewHotel?.hotel_name}</DialogTitle>
        <DialogContent dividers>
          <Typography>
            <b>Location:</b> {previewHotel?.location}
          </Typography>
          <Typography>
            <b>Room Type:</b> {previewHotel?.room_type}
          </Typography>
          <Typography>
            <b>Manual Price:</b> {previewHotel?.manual_price}
          </Typography>
          <Typography>
            <b>Check In:</b> {previewHotel?.check_in_time}
          </Typography>
          <Typography>
            <b>Check Out:</b> {previewHotel?.check_out_time}
          </Typography>
          <Typography>
            <b>Extra Beds:</b> {previewHotel?.extra_bed_available}
          </Typography>
          <Typography>
            <b>Service:</b> {previewHotel?.service}
          </Typography>
          <Typography>
            <b>Add Ons:</b> {(previewHotel?.add_ons || []).join(", ")}
          </Typography>
          <Typography>
            <b>Notes:</b> {previewHotel?.notes}
          </Typography>
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {(previewHotel?.gallery_urls || []).map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`img-${idx}`}
                style={{
                  width: 100,
                  height: 100,
                  objectFit: "cover",
                  borderRadius: 6,
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewHotel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
