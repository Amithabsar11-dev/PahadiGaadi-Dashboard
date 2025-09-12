import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import usePlacesAutocomplete, { getGeocode } from "use-places-autocomplete";
import { supabase } from "../lib/supabase";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MODES = ["Trekking", "Darshan", "Aarthi", "Others"];

function PlaceAutocompleteInput({ value, onPlaceSelected }) {
  const {
    ready,
    value: inputValue,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    requestOptions: { types: ["establishment"] },
  });

  const [open, setOpen] = useState(false);

  const handleInputChange = (e) => {
    setValue(e.target.value);
    setOpen(true);
  };

  const handleSelect = async (description) => {
    setValue(description, false);
    setOpen(false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      if (!results.length) return;
      const address = results.formatted_address;
      onPlaceSelected(description, address);
    } catch {
      onPlaceSelected(description, "");
    }
  };

  return (
    <Box sx={{ position: "relative", mb: 2 }}>
      <TextField
        label="Place Name"
        value={inputValue || ""}
        onChange={handleInputChange}
        fullWidth
        autoComplete="off"
        placeholder="Search sightseeing place"
        disabled={!ready}
      />
      {status === "OK" && open && (
        <Box
          sx={{
            position: "absolute",
            background: "#fff",
            width: "100%",
            border: "1px solid #ccc",
            boxShadow: 2,
            zIndex: 10,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {data.map(({ place_id, description }) => (
            <Box
              key={place_id}
              sx={{
                p: 1,
                cursor: "pointer",
                "&:hover": { background: "#f5f5f5" },
              }}
              onClick={() => handleSelect(description)}
            >
              {description}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default function SightseeingPointsScreen() {
  const [form, setForm] = useState({
    place_name: "",
    address: "",
    fees_adult: "",
    fees_child: "",
    open_days: "",
    open_weekdays: [],
    equipment_to_bring: [],
    not_allowed: [],
    own_risk: false,
    has_safeguard: false,
    contact_number: "",
    notes: "",
    new_equipment: "",
    new_not_allowed: "",
    gallery_urls: [], // array of urls for UI
  });

  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Local selected files for upload (previews via URL.createObjectURL)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editPoint, setEditPoint] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);

  const handleChange = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: value,
    }));

  const handleAutocompleteSelect = (name, address) => {
    setForm((f) => ({
      ...f,
      place_name: name,
      address: address ?? "",
    }));
  };

  const addEquipment = () => {
    if (form.new_equipment.trim()) {
      setForm((f) => ({
        ...f,
        equipment_to_bring: [...f.equipment_to_bring, f.new_equipment.trim()],
        new_equipment: "",
      }));
    }
  };

  const addNotAllowed = () => {
    if (form.new_not_allowed.trim()) {
      setForm((f) => ({
        ...f,
        not_allowed: [...f.not_allowed, f.new_not_allowed.trim()],
        new_not_allowed: "",
      }));
    }
  };

  const toggleWeekday = (day) => {
    setForm((f) => ({
      ...f,
      open_weekdays: f.open_weekdays.includes(day)
        ? f.open_weekdays.filter((d) => d !== day)
        : [...f.open_weekdays, day],
    }));
  };

  useEffect(() => {
    setForm((f) => ({
      ...f,
      open_days: f.open_weekdays.length,
    }));
  }, [form.open_weekdays.length]);

  const fetchSightseeingPoints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sightseeing_points")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (!error) setPoints(data || []);
  };

  useEffect(() => {
    fetchSightseeingPoints();
  }, []);

  // Upload images to storage and return public URLs
  const uploadImagesToSupabase = async (files) => {
    setUploadingImage(true);
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `sightseeing-images/${filename}`;

      const { error } = await supabase.storage
        .from("sightseeing-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        alert("Failed to upload image: " + error.message);
        setUploadingImage(false);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("sightseeing-images")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
    }
    setUploadingImage(false);
    return uploadedUrls;
  };

  // Harmonize DB field image_url (text) as array for UI
  const dbImageToArray = (image_url) => {
    if (!image_url) return [];
    // supports comma-separated or single URL (future-proof if migrated)
    return image_url
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const arrayToDbImage = (arr) => {
    if (!arr || arr.length === 0) return null;
    // persist as comma-separated string in image_url
    return arr.join(",");
  };

  // File input change: add up to 5
  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const spaceLeft = Math.max(
      0,
      5 - (form.gallery_urls.length + selectedFiles.length)
    );
    const toAdd = newFiles.slice(0, spaceLeft);
    setSelectedFiles((prev) => [...prev, ...toAdd]);
  };

  // Remove existing (url) at index from gallery
  const removeGalleryImage = (index) => {
    setForm((f) => ({
      ...f,
      gallery_urls: f.gallery_urls.filter((_, i) => i !== index),
    }));
  };

  // Remove a not-yet-uploaded file preview
  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openAddForm = () => {
    setEditPoint(null);
    setForm({
      place_name: "",
      address: "",
      fees_adult: "",
      fees_child: "",
      open_days: "",
      open_weekdays: [],
      equipment_to_bring: [],
      not_allowed: [],
      own_risk: false,
      has_safeguard: false,
      contact_number: "",
      notes: "",
      new_equipment: "",
      new_not_allowed: "",
      gallery_urls: [],
      mode: "",
      custom_mode: "",
    });
    setSelectedFiles([]);
    setFormOpen(true);
  };

  const openEditForm = (point) => {
    let mode = "";
  let custom_mode = "";

  if (MODES.includes(point.mode)) {
    mode = point.mode;
    custom_mode = "";
  } else if (point.mode) {
    mode = "Others";
    custom_mode = point.mode;
  }
    setEditPoint(point);
    setForm({
      place_name: point.place_name || "",
      address: point.address || "",
      fees_adult: point.fees_adult ?? "",
      fees_child: point.fees_child ?? "",
      open_days: point.open_days ?? "",
      open_weekdays: Array.isArray(point.open_weekdays)
        ? point.open_weekdays
        : [],
      equipment_to_bring: Array.isArray(point.equipment_to_bring)
        ? point.equipment_to_bring
        : [],
      not_allowed: Array.isArray(point.not_allowed) ? point.not_allowed : [],
      own_risk: !!point.own_risk,
      has_safeguard: !!point.has_safeguard,
      contact_number: point.contact_number || "",
      notes: point.notes || "",
      new_equipment: "",
      new_not_allowed: "",
      gallery_urls: dbImageToArray(point.image_url),
     mode: mode,
    custom_mode: custom_mode,
    });
    setSelectedFiles([]);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.place_name || !form.address) {
      alert("Enter place name and address");
      return;
    }
    setSaving(true);

    // 1) Start with existing gallery urls
    let imageUrls = [...form.gallery_urls];

    // 2) Upload any new files and append
    if (selectedFiles.length > 0) {
      const uploaded = await uploadImagesToSupabase(selectedFiles);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      imageUrls = [...imageUrls, ...uploaded].slice(0, 5);
    }

    // 3) Build payload
    const payload = {
      place_name: form.place_name,
      address: form.address || null,
      fees_adult: form.fees_adult === "" ? null : parseFloat(form.fees_adult),
      fees_child: form.fees_child === "" ? null : parseFloat(form.fees_child),
      open_days: form.open_days === "" ? null : parseInt(form.open_days),
      open_weekdays: form.open_weekdays.length ? form.open_weekdays : null,
      equipment_to_bring: form.equipment_to_bring.length
        ? form.equipment_to_bring
        : null,
      not_allowed: form.not_allowed.length ? form.not_allowed : null,
      own_risk: !!form.own_risk,
      has_safeguard: !!form.has_safeguard,
      contact_number: form.contact_number || null,
      notes: form.notes || null,
      image_url: arrayToDbImage(imageUrls),
       mode:
    form.mode === "Others"
      ? form.custom_mode?.trim() || null
      : form.mode || null,
    };

    // 4) Persist (update or insert)
    let error = null;
    if (editPoint) {
      const { error: err } = await supabase
        .from("sightseeing_points")
        .update(payload)
        .eq("id", editPoint.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("sightseeing_points")
        .insert([payload]);
      error = err;
    }

    setSaving(false);

    if (error) {
      alert("Failed to save sightseeing point: " + error.message);
    } else {
      alert(
        editPoint ? "Updated sightseeing point!" : "Added sightseeing point!"
      );
      setFormOpen(false);
      setEditPoint(null);
      setSelectedFiles([]);
      // Reset previews after save
      setForm((f) => ({ ...f, gallery_urls: [] }));
      // Refresh list to reflect changes definitively
      await fetchSightseeingPoints();
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this sightseeing point?")
    )
      return;
    const { error } = await supabase
      .from("sightseeing_points")
      .delete()
      .eq("id", id);
    if (error) {
      alert("Failed to delete sightseeing point: " + error.message);
    } else {
      setPoints((prev) => prev.filter((pt) => pt.id !== id));
    }
  };

  return (
    <Box maxWidth={1050} mx="auto" my={0} p={3}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h5" mb={3}>
          Sightseeing Points
        </Typography>

        {!formOpen && (
          <Button
            variant="contained"
            sx={{ mb: 2 }}
            color="primary"
            startIcon={<AddIcon />}
            onClick={openAddForm}
          >
            Add Sightseeing Point
          </Button>
        )}
      </div>

      {formOpen ? (
        <Box>
          <Typography variant="h5" mb={2}>
            {editPoint ? "Edit Sightseeing Point" : "Add Sightseeing Point"}
          </Typography>

          {/* Place + Address */}
          <PlaceAutocompleteInput
            value={form.place_name}
            onPlaceSelected={handleAutocompleteSelect}
          />
          <TextField
            label="Address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Auto-filled from Google, can be edited"
          />

          {/* Image upload UI identical pattern to Hotels */}
          <Button
            variant="outlined"
            disabled={form.gallery_urls.length + selectedFiles.length >= 5}
            component="label"
          >
            Upload Images (max 5)
            <input
              hidden
              multiple
              accept="image/*"
              type="file"
              onChange={(e) => {
                handleFileChange(e);
                // clear input so re-selecting same files works
                e.target.value = null;
              }}
            />
          </Button>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            {/* Existing uploaded urls */}
            {form.gallery_urls.map((url, idx) => (
              <Box
                key={`url-${idx}`}
                sx={{
                  position: "relative",
                  width: 100,
                  height: 100,
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <img
                  src={url}
                  alt={`img-${idx}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeGalleryImage(idx)}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    bgcolor: "rgba(0,0,0,0.5)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            {/* Newly selected (not yet uploaded) files */}
            {selectedFiles.map((file, idx) => (
              <Box
                key={`file-${idx}`}
                sx={{
                  position: "relative",
                  width: 100,
                  height: 100,
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`file-${idx}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeSelectedFile(idx)}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    bgcolor: "rgba(0,0,0,0.5)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          {uploadingImage && <CircularProgress size={25} sx={{ mt: 1 }} />}

          <TextField
            select
            // label="Mode"
            value={form.mode || ""}
            onChange={(e) => handleChange("mode", e.target.value)}
            SelectProps={{ native: true }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <option value="" disabled>
             Select Mode
            </option>
            {MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </TextField>

          {/* Conditional input for custom mode */}
          {form.mode === "Others" && (
            <TextField
              label="Enter custom mode"
              value={form.custom_mode || ""}
              onChange={(e) => handleChange("custom_mode", e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}

          {/* Fees */}
          <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 2 }}>
            <TextField
              label="Fee per Adult"
              value={form.fees_adult}
              type="number"
              onChange={(e) => handleChange("fees_adult", e.target.value)}
              fullWidth
            />
            <TextField
              label="Fee per Child"
              value={form.fees_child}
              type="number"
              onChange={(e) => handleChange("fees_child", e.target.value)}
              fullWidth
            />
          </Box>

          {/* Open days / weekdays */}
          <Typography fontWeight="bold" mt={2}>
            Which Days in a Week is it Open?
          </Typography>
          <FormGroup row sx={{ mb: 2 }}>
            {WEEKDAYS.map((day) => (
              <FormControlLabel
                key={day}
                control={
                  <Checkbox
                    checked={form.open_weekdays.includes(day)}
                    onChange={() => toggleWeekday(day)}
                  />
                }
                label={day}
              />
            ))}
          </FormGroup>
          <TextField
            label="Total open days"
            value={form.open_days}
            disabled
            sx={{ mb: 2 }}
            fullWidth
          />

          {/* Equipment */}
          <Box sx={{ mt: 2 }}>
            <Typography fontWeight={500} mb={1}>
              Equipments to Bring:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
              <TextField
                label="Add Equipment"
                value={form.new_equipment}
                onChange={(e) => handleChange("new_equipment", e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={addEquipment}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {form.equipment_to_bring.map((eq, i) => (
                <Chip key={i} label={eq} />
              ))}
            </Box>
          </Box>

          {/* Not Allowed */}
          <Box sx={{ mt: 2 }}>
            <Typography fontWeight={500} mb={1}>
              Not Allowed:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
              <TextField
                label="Add Not Allowed"
                value={form.new_not_allowed}
                onChange={(e) =>
                  handleChange("new_not_allowed", e.target.value)
                }
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={addNotAllowed}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {form.not_allowed.map((item, i) => (
                <Chip key={i} label={item} />
              ))}
            </Box>
          </Box>

          {/* Risk/Safeguard */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              label="Visit at your own risk"
              control={
                <Checkbox
                  checked={form.own_risk}
                  onChange={(e) => handleChange("own_risk", e.target.checked)}
                />
              }
            />
            <FormControlLabel
              label="Safeguard available"
              control={
                <Checkbox
                  checked={form.has_safeguard}
                  onChange={(e) =>
                    handleChange("has_safeguard", e.target.checked)
                  }
                />
              }
            />
          </Box>

          {/* Contact / Notes */}
          <TextField
            label="Contact Number"
            value={form.contact_number}
            onChange={(e) => handleChange("contact_number", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Additional Notes"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            multiline
            rows={2}
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              disabled={saving || uploadingImage}
              onClick={handleSubmit}
            >
              {saving ? "Saving..." : "Save Sightseeing Point"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setFormOpen(false);
                setEditPoint(null);
                setSelectedFiles([]);
                // do not wipe gallery_urls on cancel, just close
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Paper elevation={2}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Place Name</TableCell>
                  {/* <TableCell>Image</TableCell> */}
                  <TableCell>Days Open</TableCell>
                  {/* <TableCell>Equipments</TableCell> */}
                  <TableCell>Contact</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : points.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No sightseeing points found.
                    </TableCell>
                  </TableRow>
                ) : (
                  points.map((pt) => {
                    const imgs = dbImageToArray(pt.image_url);
                    return (
                      <TableRow key={pt.id}>
                        <TableCell>{pt.place_name}</TableCell>
                        {/* <TableCell>
                          {imgs && (
                            <img
                              src={imgs}
                              alt="sightseeing"
                              style={{
                                width: 80,
                                height: 60,
                                objectFit: "cover",
                              }}
                            />
                          )}
                        </TableCell> */}
                        <TableCell>{pt.open_days}</TableCell>
                        {/* <TableCell>
                          {pt.equipment_to_bring?.map((eq, i) => (
                            <Chip
                              key={i}
                              label={eq}
                              size="small"
                              sx={{ mr: 0.3 }}
                            />
                          ))}
                        </TableCell> */}
                        <TableCell>{pt.contact_number}</TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            aria-label="edit"
                            onClick={() => openEditForm(pt)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="success"
                            aria-label="preview"
                            onClick={() => setPreviewPoint(pt)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            aria-label="delete"
                            color="error"
                            onClick={() => handleDelete(pt.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog
        open={Boolean(previewPoint)}
        onClose={() => setPreviewPoint(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{previewPoint?.place_name}</DialogTitle>
        <DialogContent dividers>
          <Typography>
            <b>Address:</b> {previewPoint?.address}
          </Typography>
          <Typography>
            <b>Fees (Adult):</b> {previewPoint?.fees_adult}
          </Typography>
          <Typography>
            <b>Fees (Child):</b> {previewPoint?.fees_child}
          </Typography>
          <Typography>
            <b>Open Days:</b> {previewPoint?.open_days}
          </Typography>
          <Typography>
            <b>Open Weekdays:</b>{" "}
            {Array.isArray(previewPoint?.open_weekdays)
              ? previewPoint.open_weekdays.join(", ")
              : ""}
          </Typography>
          <Typography>
            <b>Equipment to Bring:</b>{" "}
            {Array.isArray(previewPoint?.equipment_to_bring)
              ? previewPoint.equipment_to_bring.join(", ")
              : ""}
          </Typography>
          <Typography>
            <b>Not Allowed:</b>{" "}
            {Array.isArray(previewPoint?.not_allowed)
              ? previewPoint.not_allowed.join(", ")
              : ""}
          </Typography>
          <Typography>
            <b>Own Risk:</b> {previewPoint?.own_risk ? "Yes" : "No"}
          </Typography>
          <Typography>
            <b>Safeguard:</b> {previewPoint?.has_safeguard ? "Yes" : "No"}
          </Typography>
          <Typography>
            <b>Contact Number:</b> {previewPoint?.contact_number}
          </Typography>
          <Typography>
            <b>Notes:</b> {previewPoint?.notes}
          </Typography>

          {previewPoint?.image_url && (
            <Box
              mt={2}
              textAlign="center"
              sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
            >
              {dbImageToArray(previewPoint.image_url).map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`preview-img-${idx}`}
                  style={{ maxWidth: "48%", maxHeight: 150 }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewPoint(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
