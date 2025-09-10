import React, { useState, useEffect } from "react";
import {
  Typography,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  CircularProgress,
} from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import { supabase } from "../lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

const VEHICLE_TYPES = ["Shared Taxi", "Private Taxi", "Shared Bus", "Private Bus"];

const SEATER_OPTIONS = [
  { label: "1-4", value: "1-4" },
  { label: "5-7", value: "5-7" },
  { label: "8-22", value: "8-22" },
  { label: "22-30", value: "22-30" },
];

const VEHICLE_CATEGORIES_MAPPING = {
  "1-4": "Small",
  "5-7": "Medium",
  "8-22": "Large",
  "22-30": "Extra Large",
};

const VEHICLE_CATEGORIES = [
  { name: "Alto", type: ["Shared Taxi", "Private Taxi"], seaterRange: "1-4" },
  { name: "Bolero", type: ["Shared Taxi", "Private Taxi"], seaterRange: "5-7" },
  { name: "Ertiga", type: ["Private Taxi"], seaterRange: "5-7" },
  { name: "Innova", type: ["Private Taxi"], seaterRange: "5-7" },
  { name: "Traveller", type: ["Private Bus"], seaterRange: "8-22" },
  { name: "Urbania", type: ["Private Bus"], seaterRange: "8-22" },
  { name: "Economy Bus", type: ["Private Bus"], seaterRange: "22-30" },
  { name: "Premium Bus", type: ["Private Bus"], seaterRange: "22-30" },
  { name: "Luxury Bus", type: ["Private Bus"], seaterRange: "22-30" },
];

const getModelsBySeaterAndType = (seaterRange, vehicleType) => {
  if (!seaterRange || !vehicleType) return [];
  return VEHICLE_CATEGORIES.filter(
    (cat) => cat.seaterRange === seaterRange && cat.type.includes(vehicleType)
  ).map((cat) => cat.name);
};

export default function VehicleForm({ onSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { model: editModel, isEditing } = location.state || {};

  const [vehicleType, setVehicleType] = useState(editModel?.vehicles?.vehicleType || "");
  const [seaterRange, setSeaterRange] = useState(editModel?.seater_range || "");
  const [modelName, setModelName] = useState(editModel?.model_name || "");
  const [vehicleCategory, setVehicleCategory] = useState(editModel?.vehicle_category || "");
  const [serviceName, setServiceName] = useState(editModel?.service_name || "");
  const [acType, setAcType] = useState(editModel?.ac_type || "");
  const [hasCarrier, setHasCarrier] = useState(editModel?.has_carrier || false);
  const [imageFiles, setImageFiles] = useState(editModel?.image_url ? [{ url: editModel.image_url, file: null }] : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (seaterRange && VEHICLE_CATEGORIES_MAPPING[seaterRange]) {
      setVehicleCategory(VEHICLE_CATEGORIES_MAPPING[seaterRange]);
    } else {
      setVehicleCategory("");
    }
  }, [seaterRange]);

  useEffect(() => {
    if (!isEditing) {
      setModelName("");
      setImageFiles([]);
    }
  }, [seaterRange, vehicleType, isEditing]);

  const availableModels = getModelsBySeaterAndType(seaterRange, vehicleType);

  const uploadImage = async (file) => {
    try {
      const ext = file.name.split(".").pop();
      const filePath = `admin/vehicle-models/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("vehicles").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("vehicles").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - imageFiles.length);
    const newFiles = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImageFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !vehicleType ||
      !seaterRange ||
      !modelName ||
      !vehicleCategory ||
      !serviceName.trim() ||
      !acType ||
      (imageFiles.length === 0 && !isEditing)
    ) {
      alert("Please fill all required fields including AC type and at least one image.");
      return;
    }

    setLoading(true);
    try {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("vehicleType", vehicleType)
        .limit(1)
        .single();

      if (vehicleError || !vehicleData) {
        throw new Error("Vehicle type not found in vehicles table");
      }

      // Upload new images only (files which have non-null file object)
      const uploadedUrls = await Promise.all(
        imageFiles.map(async (img) => {
          if (img.file) {
            return await uploadImage(img.file);
          }
          return img.url; // Existing image URL (no upload)
        })
      );

      // For simplicity assume storing first image url in image_url field (extend as needed for multiple images)
      const imageUrl = uploadedUrls[0] || null;

      if (isEditing && editModel?.id) {
        const { error: updateError } = await supabase
          .from("vehicles_model")
          .update({
            vehicle_id: vehicleData.id,
            model_name: modelName,
            vehicle_category: vehicleCategory,
            ac_type: acType,
            has_carrier: hasCarrier,
            image_url: imageUrl,
            service_name: serviceName.trim(),
            seater_range: seaterRange,
          })
          .eq("id", editModel.id);

        if (updateError) throw updateError;
        alert("✅ Vehicle model updated successfully!");
      } else {
        const { error: insertError } = await supabase.from("vehicles_model").insert([
          {
            vehicle_id: vehicleData.id,
            model_name: modelName,
            vehicle_category: vehicleCategory,
            ac_type: acType,
            has_carrier: hasCarrier,
            image_url: imageUrl,
            service_name: serviceName.trim(),
            seater_range: seaterRange,
          },
        ]);
        if (insertError) throw insertError;
        alert("✅ Vehicle model added successfully!");
      }

      onSuccess?.();
      navigate("/vehiclelist");
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 600, margin: "auto", padding: 24 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: "bold", textAlign: "center" }}>
        {isEditing ? "✏️ Edit Vehicle Model" : "🚗 Add New Vehicle Model"}
      </Typography>

      <FormControl fullWidth required sx={{ mb: 3 }}>
        <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
        <Select
          labelId="vehicle-type-label"
          label="Vehicle Type"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          {VEHICLE_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth required sx={{ mb: 3 }}>
        <InputLabel id="seater-range-label">Seater Capacity</InputLabel>
        <Select
          labelId="seater-range-label"
          label="Seater Capacity"
          value={seaterRange}
          onChange={(e) => setSeaterRange(e.target.value)}
        >
          {SEATER_OPTIONS.map(({ label, value }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Vehicle Category"
        fullWidth
        required
        sx={{ mb: 3 }}
        value={vehicleCategory}
        onChange={(e) => setVehicleCategory(e.target.value)}
        helperText="Automatically set based on seater capacity; you can edit if needed."
      />

      <FormControl
        fullWidth
        required
        sx={{ mb: 3 }}
        disabled={!seaterRange || !vehicleType || availableModels.length === 0}
      >
        <InputLabel id="model-name-label">Model Name</InputLabel>
        <Select
          labelId="model-name-label"
          label="Model Name"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          notched
        >
          {availableModels.length ? (
            availableModels.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>No available models</MenuItem>
          )}
        </Select>
      </FormControl>

      <TextField
        label="Service Name"
        required
        fullWidth
        value={serviceName}
        onChange={(e) => setServiceName(e.target.value)}
        sx={{ mb: 3 }}
        placeholder="Enter service offering details"
      />

      <FormControl fullWidth required sx={{ mb: 3 }}>
        <InputLabel id="ac-type-label">AC Type</InputLabel>
        <Select
          labelId="ac-type-label"
          label="AC Type"
          value={acType}
          onChange={(e) => setAcType(e.target.value)}
        >
          <MenuItem value="AC">AC</MenuItem>
          <MenuItem value="Non AC">Non AC</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={hasCarrier}
            onChange={(e) => setHasCarrier(e.target.checked)}
          />
        }
        label="Has Carrier"
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 2, flexWrap: "wrap" }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<PhotoCamera />}
          sx={{ borderRadius: 99 }}
          disabled={imageFiles.length >= 5}
        >
          Upload Images
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleAddImages}
          />
        </Button>

        {imageFiles.map((img, index) => (
          <Box
            key={index}
            sx={{
              position: "relative",
              width: 64,
              height: 64,
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: 2,
            }}
          >
            <img
              src={img.url}
              alt={`upload-preview-${index}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <Box
              onClick={() => handleRemoveImage(index)}
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: "50%",
                width: 20,
                height: 20,
                color: "white",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: 14,
                userSelect: "none",
              }}
            >
              ×
            </Box>
          </Box>
        ))}
      </Box>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading}
      >
        {loading
          ? isEditing
            ? "Updating..."
            : "Adding..."
          : isEditing
          ? "Update Vehicle Model"
          : "Add Vehicle Model"}
      </Button>
    </form>
  );
}
