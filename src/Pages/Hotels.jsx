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
  Card,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper as MuiPaper,
} from "@mui/material";
import { ArrowBack, Add, Delete } from "@mui/icons-material";
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

const GOOGLE_MAPS_API_KEY = "AIzaSyCZzvtEzsasKJAHjzM-lJi1XlTauDhgqUY";

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
  const [roomTypes, setRoomTypes] = useState([]);
  const [foodAvailable, setFoodAvailable] = useState(false);
  const [zoneClusters, setZoneClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteHotelId, setDeleteHotelId] = useState(null);

  const [foodOptions, setFoodOptions] = useState({
    breakfast: { selected: false, type: "complimentary", price: "" },
    lunch: { selected: false, type: "complimentary", price: "" },
    dinner: { selected: false, type: "complimentary", price: "" },
  });

  const [extraBedsCount, setExtraBedsCount] = useState("");
  const [extraBedsType, setExtraBedsType] = useState("complimentary"); // or 'price'
  const [extraBedsPrice, setExtraBedsPrice] = useState("");

  useEffect(() => {
    async function fetchZonesClusters() {
      const { data, error } = await supabase
        .from("zones_clusters")
        .select("id, zone_name, cluster_name")
        .order("zone_name", { ascending: true });
      if (error) console.error("Error fetching zones_clusters:", error);
      else setZoneClusters(data);
    }
    fetchZonesClusters();
  }, []);

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
    amenities: "",
    amenitiesPriceOption: "",
    amenitiesPriceValue: "",
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

    // fetch hotels
    const { data: hotelsData, error: hotelError } = await supabase
      .from("hotels_model")
      .select("*")
      .order("created_at", { ascending: false });

    if (hotelError) {
      console.error("Error fetching hotels:", hotelError);
      setLoading(false);
      return;
    }

    const { data: roomTypesData, error: roomError } = await supabase
      .from("hotel_room_types")
      .select("*");

    if (roomError) {
      console.error("Error fetching room types:", roomError);
    }

    const hotelsWithRooms = (hotelsData || []).map((hotel) => ({
      ...hotel,
      roomTypes: (roomTypesData || []).filter((rt) => rt.hotel_id === hotel.id),
    }));

    setHotels(hotelsWithRooms);
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
        hotel_location: val,
        zone,
        cluster,
      }));

      if (!zone || !cluster) {
        setZoneError("Could not determine zone or cluster for this location");
      }
    } catch (err) {
      setZoneError("Error checking location: " + err.message);
      setForm((prev) => ({
        ...prev,
        hotel_location: "",
        zone: "",
        cluster: "",
      }));
      setLocationLatLng(null);
    }
  }

  const handleClusterChange = (clusterName) => {
    setSelectedCluster(clusterName);
    const matched = zoneClusters.find((zc) => zc.cluster_name === clusterName);
    const zone = matched ? matched.zone_name : "";
    setSelectedZone(zone);

    setForm((prev) => ({
      ...prev,
      cluster: clusterName,
      zone: zone,
    }));
  };

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
      try {
        // Prepare filename and path
        const ext = file.name.split(".").pop();
        const safeHotelName = form.hotel_name
          .replace(/\s+/g, "_")
          .toLowerCase();
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = `${safeHotelName}/${filename}`;

        // Upload file to hotels-gallery bucket
        const { error: uploadError } = await supabase.storage
          .from("hotels-gallery")
          .upload(path, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Get public URL for uploaded file
        const { data } = supabase.storage
          .from("hotels-gallery")
          .getPublicUrl(path);

        newImages.push({ url: data.publicUrl });
      } catch (e) {
        console.error("Error uploading image:", e);
      }
    }

    setForm((prev) => ({
      ...prev,
      gallery_urls: [...(prev.gallery_urls || []), ...newImages].slice(0, 5),
    }));
  }

  function removeImage(index) {
    setForm((prev) => ({
      ...prev,
      gallery_urls: prev.gallery_urls.filter((_, i) => i !== index),
    }));
  }

  // ✅ Update a field inside a specific room type
  const updateRoomType = (index, field, value) => {
    setForm((prev) => {
      const updatedRoomTypes = [...(prev.roomTypes || [])];
      updatedRoomTypes[index] = { ...updatedRoomTypes[index], [field]: value };
      return { ...prev, roomTypes: updatedRoomTypes };
    });
  };

  // ✅ Add uploaded images for a room
  const addRoomImages = (index, files) => {
    const newImages = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setForm((prev) => {
      const updatedRoomTypes = [...(prev.roomTypes || [])];
      updatedRoomTypes[index] = {
        ...updatedRoomTypes[index],
        gallery_urls: [
          ...(updatedRoomTypes[index].gallery_urls || []),
          ...newImages,
        ],
      };
      return { ...prev, roomTypes: updatedRoomTypes };
    });
  };

  // ✅ Remove an image from a room
  const removeRoomImage = (roomIndex, imageIndex) => {
    setForm((prev) => {
      const updatedRoomTypes = [...(prev.roomTypes || [])];
      updatedRoomTypes[roomIndex] = {
        ...updatedRoomTypes[roomIndex],
        gallery_urls: updatedRoomTypes[roomIndex].gallery_urls.filter(
          (_, i) => i !== imageIndex
        ),
      };
      return { ...prev, roomTypes: updatedRoomTypes };
    });
  };

  // ✅ Upload image to hotels-gallery/{hotel_name}/filename
  async function uploadRoomImage(file, hotelName) {
    const ext = file.name.split(".").pop();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const folder = hotelName.replace(/\s+/g, "_"); // sanitize folder name
    const path = `${folder}/${filename}`;

    const { error } = await supabase.storage
      .from("hotels-gallery")
      .upload(path, file);

    if (error) throw error;

    const { data } = supabase.storage.from("hotels-gallery").getPublicUrl(path);

    return data.publicUrl;
  }

  const saveHotel = async () => {
    try {
      setSaving(true);

      // ✅ Prepare hotel payload
      const payload = {
        service: form.service || null,
        hotel_category: form.hotel_category || null,
        max_price_per_room: form.max_price_per_room
          ? parseInt(form.max_price_per_room, 10)
          : null,
        room_type: form.room_type || null,
        add_ons: form.add_ons?.length ? form.add_ons : null,
        notes: form.notes || null,
        hotel_name: form.hotel_name || null,
        location: form.location || null,
        hotel_location: form.hotel_location || null,
        zone: form.zone || null,
        cluster: form.cluster || null,
        rating: form.rating ? parseFloat(form.rating) : null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        stay_duration_hours: form.stay_duration_hours
          ? parseFloat(form.stay_duration_hours)
          : null,
        stay_duration_desc: form.stay_duration_desc || null,
        food: form.food || false,
        extra_bed_available: form.extra_bed_available
          ? parseInt(form.extra_bed_available, 10)
          : null,
        manual_price: form.manual_price ? parseFloat(form.manual_price) : null,
        gallery_urls: form.gallery_urls?.map((g) => (g.url ? g.url : g)) || [],
        amenities: form.amenities || null,
        amenities_price_option: form.amenitiesPriceOption || null,
        amenities_price:
          form.amenitiesPriceOption === "none"
            ? null
            : form.amenitiesPriceValue
            ? parseFloat(form.amenitiesPriceValue)
            : null,
      };

      let hotelId = editHotel?.id;

      if (editHotel) {
        // ✅ Update hotel
        const { error } = await supabase
          .from("hotels_model")
          .update(payload)
          .eq("id", hotelId);

        if (error) throw error;

        // Delete old room types before re-inserting
        await supabase
          .from("hotel_room_types")
          .delete()
          .eq("hotel_id", hotelId);
      } else {
        // ✅ Insert new hotel
        const { data, error } = await supabase
          .from("hotels_model")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        hotelId = data.id;
      }

      // ✅ Insert room types
      for (const rt of form.roomTypes || []) {
        const uploadedUrls = [];

        // Upload each image if it's a File
        for (const img of rt.gallery_urls || []) {
          if (img.file) {
            try {
              const url = await uploadRoomImage(img.file, form.hotel_name);
              uploadedUrls.push(url);
            } catch (e) {
              console.error("Image upload failed:", e);
            }
          } else if (img.url) {
            uploadedUrls.push(img.url); // keep already uploaded
          } else if (typeof img === "string") {
            uploadedUrls.push(img); // if it's already a URL string
          }
        }

        const roomPayload = {
          hotel_id: hotelId,
          room_type: rt.room_type || null,
          hotel_category: rt.hotel_category || null,
          base_occupancy: rt.base_occupancy
            ? parseInt(rt.base_occupancy, 10)
            : null,
          max_occupancy: rt.max_occupancy
            ? parseInt(rt.max_occupancy, 10)
            : null,
          max_extra_beds: rt.extra_beds_info?.count
            ? parseInt(rt.extra_beds_info.count, 10)
            : null,
          food: rt.food || false,
          add_ons: (() => {
            const addons = [];
            if (rt.food_options?.breakfast?.selected) addons.push("Breakfast");
            if (rt.food_options?.lunch?.selected) addons.push("Lunch");
            if (rt.food_options?.dinner?.selected) addons.push("Dinner");
            if (rt.extra_beds_info?.count) addons.push("Extra Bed");
            return addons.length ? addons : null;
          })(),
          notes: rt.notes || null,
          manual_price: rt.manual_price ? parseFloat(rt.manual_price) : null,
          gallery_urls: uploadedUrls,
          food_options: rt.food_options || null,
          extra_beds_info: rt.extra_beds_info || null,
        };

        const { error: roomError } = await supabase
          .from("hotel_room_types")
          .insert(roomPayload);

        if (roomError) throw roomError;
      }

      // ✅ Reset after save
      resetForm();
      setAddOpen(false);
      setEditHotel(null);
      fetchHotels();
    } catch (err) {
      console.error("Error saving hotel:", err);
      alert("Failed to save hotel. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

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
      amenities: "",
      amenitiesPriceOption: "",
      amenitiesPriceValue: "",
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
      amenities: hotel.amenities || "",
      amenitiesPriceOption: hotel.amenities_price_option || "",
      amenitiesPriceValue: hotel.amenities_price
        ? hotel.amenities_price.toString()
        : "",
      roomTypes: (hotel.roomTypes || []).map((rt) => ({
        ...rt,
        manual_price: rt.manual_price ? rt.manual_price.toString() : "",
        base_occupancy: rt.base_occupancy ? rt.base_occupancy.toString() : "",
        max_occupancy: rt.max_occupancy ? rt.max_occupancy.toString() : "",
        extra_bed_available: rt.max_extra_beds
          ? rt.max_extra_beds.toString()
          : "",
        gallery_urls: rt.gallery_urls
          ? rt.gallery_urls.map((url) => ({ url, file: null }))
          : [],
      })),
    });

    setSelectedRouteId(hotel.route_id || "");
    setAddOpen(true);
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Back button only visible when addOpen is true */}
          {addOpen && (
            <IconButton onClick={() => setAddOpen(false)}>
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h5">Hotels Admin Panel</Typography>
        </div>

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
            <TextField
              label="Hotel Name"
              value={form.hotel_name}
              onChange={(e) => setField("hotel_name", e.target.value)}
              required
            />

            <PlacesAutocompleteInput
              label="Hotel Location"
              value={form.hotel_location}
              onChange={onLocationChange}
              placeholder="Search location"
            />

            <TextField
              label="Address"
              value={form.location || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="Enter hotel Address"
            />

            <TextField
              label="Rating"
              value={form.rating}
              onChange={(e) => setField("rating", e.target.value)}
              type="number"
            />
            {/* 
            <TextField
              label="Capacity"
              value={form.capacity}
              onChange={(e) => setField("capacity", e.target.value)}
              type="number"
            /> */}

            <TextField
              label="Contact"
              value={form.service}
              onChange={(e) => setField("service", e.target.value)}
            />
            {zoneError && <Typography color="error">{zoneError}</Typography>}

            <FormControl fullWidth>
              <InputLabel id="cluster-select-label">Cluster</InputLabel>
              <Select
                labelId="cluster-select-label"
                value={selectedCluster}
                label="Cluster"
                onChange={(e) => {
                  const clusterName = e.target.value;
                  setSelectedCluster(clusterName);
                  // Also auto-select zone based on cluster
                  const matched = zoneClusters.find(
                    (zc) => zc.cluster_name === clusterName
                  );
                  if (matched) setSelectedZone(matched.zone_name);
                  else setSelectedZone("");
                }}
              >
                <MenuItem value="">
                  <em>Select Cluster</em>
                </MenuItem>
                {zoneClusters.map((zc) => (
                  <MenuItem key={zc.id} value={zc.cluster_name}>
                    {zc.cluster_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Zone"
              value={selectedZone}
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Check In Time"
              type="time"
              value={form.check_in_time}
              onChange={(e) => setField("check_in_time", e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              fullWidth
            />

            <TextField
              label="Check-out Time"
              type="time"
              value={form.check_out_time}
              onChange={(e) => setField("check_out_time", e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              fullWidth
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
            <TextField
              label="Amenities"
              value={form.amenities || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amenities: e.target.value }))
              }
              fullWidth
            />
            {form.amenities && form.amenities.trim() !== "" && (
              <>
                <FormControl fullWidth>
                  <InputLabel id="amenities-price-option-label">
                    Price
                  </InputLabel>
                  <Select
                    labelId="amenities-price-option-label"
                    value={form.amenitiesPriceOption || ""}
                    label="Price"
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        amenitiesPriceOption: val,
                        amenitiesPriceValue:
                          val === "none" ? "" : prev.amenitiesPriceValue,
                      }));
                    }}
                  >
                    <MenuItem value="price per person">
                      Price per person
                    </MenuItem>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>

                {(form.amenitiesPriceOption === "price per person" ||
                  form.amenitiesPriceOption === "all") && (
                  <TextField
                    label="Price Value"
                    value={form.amenitiesPriceValue || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        amenitiesPriceValue: e.target.value,
                      }))
                    }
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                )}
              </>
            )}

            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" component="label" sx={{ mb: 1 }}>
                Upload Hotel Images
                <input
                  hidden
                  multiple
                  accept="image/*"
                  type="file"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length === 0) return;
                    await addImages(files);
                    e.target.value = null;
                  }}
                />
              </Button>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {(form.gallery_urls || []).map((img, i) => (
                  <Box
                    key={i}
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
                      alt={`hotel-img-${i}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(i)} // call your existing removeImage function
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        color: "white",
                        "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* ----------- ROOM TYPES SECTION ----------- */}
          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  roomTypes: [
                    ...(prev.roomTypes || []),
                    {
                      room_type: "",
                      hotel_category: "",
                      manual_price: "",
                      base_occupancy: "",
                      max_occupancy: "",
                      extra_bed_available: "",
                      food: false,
                      add_ons: [],
                      notes: "",
                      gallery_urls: [],
                    },
                  ],
                }))
              }
            >
              Add Room Type
            </Button>

            {(form.roomTypes || []).map((room, idx) => (
              <Paper key={idx} sx={{ p: 2, mt: 2, position: "relative" }}>
                <IconButton
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      roomTypes: prev.roomTypes.filter((_, i) => i !== idx),
                    }))
                  }
                  sx={{ position: "absolute", top: 8, right: 8 }}
                >
                  <Delete />
                </IconButton>
                <Typography variant="subtitle1">Room Type {idx + 1}</Typography>

                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                  }}
                >
                  {/* Room Type */}
                  <TextField
                    label="Room Type *"
                    value={room.room_type}
                    onChange={(e) =>
                      updateRoomType(idx, "room_type", e.target.value)
                    }
                  />

                  {/* Category */}
                  <TextField
                    label="Category *"
                    value={room.hotel_category}
                    onChange={(e) =>
                      updateRoomType(idx, "hotel_category", e.target.value)
                    }
                  />

                  {/* Manual Price */}
                  <TextField
                    label="Manual Price *"
                    type="number"
                    value={room.manual_price}
                    onChange={(e) =>
                      updateRoomType(idx, "manual_price", e.target.value)
                    }
                  />

                  {/* Base Occupancy */}
                  <TextField
                    label="Base Occupancy *"
                    type="number"
                    value={room.base_occupancy}
                    onChange={(e) =>
                      updateRoomType(idx, "base_occupancy", e.target.value)
                    }
                  />

                  {/* Max Occupancy */}
                  <TextField
                    label="Max Occupancy *"
                    type="number"
                    value={room.max_occupancy}
                    onChange={(e) =>
                      updateRoomType(idx, "max_occupancy", e.target.value)
                    }
                  />
                  {/* Extra Beds */}
                  <Box sx={{ mt: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!room.extra_beds_info}
                          onChange={(e) =>
                            updateRoomType(
                              idx,
                              "extra_beds_info",
                              e.target.checked ? {} : null
                            )
                          }
                        />
                      }
                      label="Extra Beds"
                    />

                    {room.extra_beds_info && (
                      <Card
                        variant="outlined"
                        sx={{ mt: 2, p: 2, borderRadius: 2, boxShadow: 1 }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: "bold", mb: 2 }}
                        >
                          Extra Beds Options
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Extra Beds Count"
                              type="number"
                              fullWidth
                              value={room.extra_beds_info.count || ""}
                              onChange={(e) =>
                                updateRoomType(idx, "extra_beds_info", {
                                  ...room.extra_beds_info,
                                  count: e.target.value,
                                })
                              }
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                              <Select
                                value={room.extra_beds_info.type || ""}
                                onChange={(e) =>
                                  updateRoomType(idx, "extra_beds_info", {
                                    ...room.extra_beds_info,
                                    type: e.target.value,
                                  })
                                }
                                displayEmpty
                                renderValue={(selected) => {
                                  if (!selected) {
                                    return (
                                      <span style={{ color: "#999" }}>
                                        Type
                                      </span>
                                    );
                                  }
                                  return selected;
                                }}
                              >
                                <MenuItem disabled value="">
                                  Type
                                </MenuItem>
                                <MenuItem value="complimentary">
                                  Complimentary
                                </MenuItem>
                                <MenuItem value="price">Price</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          {room.extra_beds_info.type === "price" && (
                            <Grid item xs={12} md={4}>
                              <TextField
                                label="Price per Extra Bed"
                                type="number"
                                fullWidth
                                value={room.extra_beds_info.price || ""}
                                onChange={(e) =>
                                  updateRoomType(idx, "extra_beds_info", {
                                    ...room.extra_beds_info,
                                    price: e.target.value,
                                  })
                                }
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Card>
                    )}
                  </Box>

                  {/* Food Available */}
                  <FormGroup sx={{ mt: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={room.food}
                          onChange={(e) =>
                            updateRoomType(idx, "food", e.target.checked)
                          }
                        />
                      }
                      label="Food Available"
                    />
                  </FormGroup>

                  {/* Food Options */}
                  {room.food && (
                    <Box sx={{ mt: 2 }}>
                      <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                        Food Options
                      </Typography>

                      <FormGroup row>
                        {["Breakfast", "Lunch", "Dinner"].map((meal) => (
                          <FormControlLabel
                            key={meal}
                            control={
                              <Checkbox
                                checked={
                                  room.food_options?.[meal.toLowerCase()]
                                    ?.selected || false
                                }
                                onChange={(e) => {
                                  const updated = {
                                    ...(room.food_options || {}),
                                    [meal.toLowerCase()]: {
                                      ...(room.food_options?.[
                                        meal.toLowerCase()
                                      ] || {}),
                                      selected: e.target.checked,
                                    },
                                  };
                                  updateRoomType(idx, "food_options", updated);
                                }}
                              />
                            }
                            label={meal}
                          />
                        ))}
                      </FormGroup>

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {["breakfast", "lunch", "dinner"].map(
                          (meal) =>
                            room.food_options?.[meal]?.selected && (
                              <Grid item xs={12} md={4} key={meal}>
                                <Card
                                  variant="outlined"
                                  sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: "bold", mb: 2 }}
                                  >
                                    {meal.charAt(0).toUpperCase() +
                                      meal.slice(1)}{" "}
                                    Options
                                  </Typography>

                                  <FormControl fullWidth sx={{ mb: 2 }}>
                                    <Select
                                      value={room.food_options[meal].type || ""}
                                      onChange={(e) => {
                                        const updated = {
                                          ...room.food_options,
                                          [meal]: {
                                            ...room.food_options[meal],
                                            type: e.target.value,
                                          },
                                        };
                                        updateRoomType(
                                          idx,
                                          "food_options",
                                          updated
                                        );
                                      }}
                                      displayEmpty
                                      renderValue={(selected) => {
                                        if (!selected) {
                                          return (
                                            <span style={{ color: "#999" }}>
                                              Type
                                            </span>
                                          );
                                        }
                                        return selected;
                                      }}
                                    >
                                      <MenuItem disabled value="">
                                        Type
                                      </MenuItem>
                                      <MenuItem value="complimentary">
                                        Complimentary
                                      </MenuItem>
                                      <MenuItem value="price">Price</MenuItem>
                                    </Select>
                                  </FormControl>

                                  {room.food_options[meal].type === "price" && (
                                    <TextField
                                      label={`Price per person (${meal})`}
                                      type="number"
                                      fullWidth
                                      value={
                                        room.food_options[meal].price || ""
                                      }
                                      onChange={(e) => {
                                        const updated = {
                                          ...room.food_options,
                                          [meal]: {
                                            ...room.food_options[meal],
                                            price: e.target.value,
                                          },
                                        };
                                        updateRoomType(
                                          idx,
                                          "food_options",
                                          updated
                                        );
                                      }}
                                    />
                                  )}
                                </Card>
                              </Grid>
                            )
                        )}
                      </Grid>
                    </Box>
                  )}

                  {/* Notes */}
                  <TextField
                    label="Notes"
                    multiline
                    rows={2}
                    value={room.notes}
                    onChange={(e) =>
                      updateRoomType(idx, "notes", e.target.value)
                    }
                  />

                  {/* Upload Images */}
                  <Box>
                    <Button
                      variant="outlined"
                      disabled={room.gallery_urls.length >= 5}
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
                            5 - room.gallery_urls.length
                          );
                          addRoomImages(idx, files);
                          e.target.value = null;
                        }}
                      />
                    </Button>
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}
                    >
                      {room.gallery_urls.map((img, i) => (
                        <Box
                          key={i}
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
                            alt={`room-img-${i}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeRoomImage(idx, i)}
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
                </Box>
              </Paper>
            ))}
          </Box>

          {/* ----------- SAVE & CANCEL ----------- */}
          <Box
            sx={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              mt: 3,
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
        </Paper>
      )}
      {!addOpen && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Room Types</TableCell>
                  <TableCell>Manual Prices</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Gallery</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    {/* ✅ Hotel Name */}
                    <TableCell>{hotel.hotel_name}</TableCell>

                    {/* ✅ Show all room types */}
                    <TableCell>
                      {hotel.roomTypes?.length > 0
                        ? hotel.roomTypes.map((rt, i) => (
                            <div key={i}>{rt.room_type}</div>
                          ))
                        : "-"}
                    </TableCell>

                    {/* ✅ Show manual prices for each room type */}
                    <TableCell>
                      {hotel.roomTypes?.length > 0
                        ? hotel.roomTypes.map((rt, i) => (
                            <div key={i}>
                              {rt.manual_price ? `₹${rt.manual_price}` : "-"}
                            </div>
                          ))
                        : "-"}
                    </TableCell>

                    {/* ✅ Service */}
                    <TableCell>{hotel.service}</TableCell>

                    {/* ✅ Show gallery thumbnails from all room types */}
                    <TableCell>
                      {hotel.roomTypes
                        ?.flatMap((rt) => rt.gallery_urls || [])
                        .map((url, i) => (
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

                    {/* ✅ Actions */}
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
                            setDeleteHotelId(hotel.id);
                            setDeleteDialogOpen(true);
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
      )}
      <Dialog
        open={Boolean(previewHotel)}
        onClose={() => setPreviewHotel(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{previewHotel?.hotel_name}</DialogTitle>
        <DialogContent dividers>
          {/* Hotel-level info */}
          <Typography>
            <b>Location:</b> {previewHotel?.location}
          </Typography>
          <Typography>
            <b>Service:</b> {previewHotel?.service}
          </Typography>
          <Typography>
            <b>Food Available:</b> {previewHotel?.food ? "Yes" : "No"}
          </Typography>
          <Typography>
            <b>Notes:</b> {previewHotel?.notes}
          </Typography>

          {/* Hotel Gallery */}
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {(previewHotel?.gallery_urls || []).map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`hotel-img-${idx}`}
                style={{
                  width: 100,
                  height: 100,
                  objectFit: "cover",
                  borderRadius: 6,
                }}
              />
            ))}
          </Box>

          {/* Room Types Section */}
          {previewHotel?.roomTypes?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Room Types
              </Typography>
              {previewHotel.roomTypes.map((rt, i) => (
                <Paper key={i} sx={{ p: 2, mt: 2 }}>
                  <Typography variant="subtitle1">
                    <b>{rt.room_type}</b>
                  </Typography>
                  <Typography>
                    <b>Category:</b> {rt.hotel_category}
                  </Typography>
                  <Typography>
                    <b>Manual Price:</b> {rt.manual_price}
                  </Typography>
                  <Typography>
                    <b>Base Occupancy:</b> {rt.base_occupancy}
                  </Typography>
                  <Typography>
                    <b>Max Occupancy:</b> {rt.max_occupancy}
                  </Typography>
                  <Typography>
                    <b>Extra Beds:</b> {rt.max_extra_beds}
                  </Typography>
                  <Typography>
                    <b>Add Ons:</b> {(rt.add_ons || []).join(", ")}
                  </Typography>
                  <Typography>
                    <b>Notes:</b> {rt.notes}
                  </Typography>
                  <Typography>
                    <b>Check In:</b> {rt.check_in_time}
                  </Typography>
                  <Typography>
                    <b>Check Out:</b> {rt.check_out_time}
                  </Typography>
                  <Box
                    sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}
                  >
                    {(rt.gallery_urls || []).map((url, j) => (
                      <img
                        key={j}
                        src={url.url || url}
                        alt={`room-${i}-img-${j}`}
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPreviewHotel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this hotel?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={async () => {
              // do deletion here (call supabase to delete)
              await supabase
                .from("hotelsmodel")
                .delete()
                .eq("id", deleteHotelId);
              setHotels(hotels.filter((h) => h.id !== deleteHotelId));
              setDeleteDialogOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
