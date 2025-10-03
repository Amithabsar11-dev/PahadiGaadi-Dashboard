import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Stack,
} from "@mui/material";
import { Add, Edit, Visibility, Delete, Close } from "@mui/icons-material";
import { blue, green } from "@mui/material/colors";
import { supabase } from "../lib/supabase";

export default function AddOnsManagement() {
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState(null);
  const [previewAddOn, setPreviewAddOn] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
  });
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDeleteAddOnId, setToDeleteAddOnId] = useState(null);

  useEffect(() => {
    fetchAddOns();
  }, []);

  const fetchAddOns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("add_ons")
      .select()
      .order("created_at", { ascending: false });
    if (error) {
      alert("Failed to fetch add-ons: " + error.message);
    } else {
      setAddOns(data);
    }
    setLoading(false);
  };

  const openAddForm = () => {
    setEditingAddOn(null);
    setFormData({ title: "", description: "", price: "", images: [] });
    setShowForm(true);
  };

  const openEditForm = (addOn) => {
    setEditingAddOn(addOn);
    setFormData({
      title: addOn.title,
      description: addOn.description || "",
      price: addOn.price ? addOn.price.toString() : "",
      images: (addOn.images || []).map((url) => ({ url, file: null })),
    });
    setShowForm(true);
  };

  const openPreviewDialog = (addOn) => {
    setPreviewAddOn(addOn);
  };

  const closePreviewDialog = () => {
    setPreviewAddOn(null);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageAdd = async (files) => {
    if (!files.length) return;
    const newImages = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages].slice(0, 5),
    }));
  };

  const handleImageRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const uploadImages = async () => {
    const uploadedUrls = [];
    for (const img of formData.images) {
      if (img.url && !img.file) {
        uploadedUrls.push(img.url);
      } else if (img.file) {
        const ext = img.file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}.${ext}`;
        const path = `add_ons/${fileName}`;
        const { error } = await supabase.storage
          .from("add_ons")
          .upload(path, img.file);
        if (error) throw error;
        const { data } = supabase.storage.from("add_ons").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleFormSubmit = async () => {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!formData.price || isNaN(Number(formData.price))) {
      alert("Price must be a valid number");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = await uploadImages();
      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        images: uploadedUrls,
      };

      if (editingAddOn) {
        const { error } = await supabase
          .from("add_ons")
          .update(payload)
          .eq("id", editingAddOn.id);
        if (error) throw error;
        alert("Add-on updated");
      } else {
        const { error } = await supabase.from("add_ons").insert(payload);
        if (error) throw error;
        alert("Add-on created");
      }
      setShowForm(false);
      fetchAddOns();
    } catch (error) {
      alert("Failed to save add-on: " + error.message);
    }
    setUploading(false);
  };


  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Add-Ons</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAddForm}>
          Add Add-On
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Price (₹)</TableCell>
                <TableCell>Images</TableCell>
                <TableCell align="left">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addOns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No add-ons found
                  </TableCell>
                </TableRow>
              )}
              {addOns.map((addOn) => (
                <TableRow key={addOn.id}>
                  <TableCell>{addOn.title}</TableCell>
                  <TableCell>{addOn.description || "-"}</TableCell>
                  <TableCell>{addOn.price.toFixed(2)}</TableCell>
                  <TableCell>
                    {addOn.images && addOn.images.length > 0
                      ? addOn.images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`addon_img_${idx}`}
                            style={{
                              width: 40,
                              height: 40,
                              marginRight: 8,
                              borderRadius: 4,
                            }}
                          />
                        ))
                      : "-"}
                  </TableCell>
                  <TableCell align="left">
                    <IconButton
                      onClick={() => openEditForm(addOn)}
                      title="Edit"
                      sx={{ color: blue[600] }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => openPreviewDialog(addOn)}
                      title="Preview"
                      sx={{ color: green[600] }}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setDeleteDialogOpen(true);
                        setToDeleteAddOnId(addOn.id);
                      }}
                      title="Delete"
                      sx={{ color: "red" }}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAddOn ? "Edit Add-On" : "Add New Add-On"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
          <TextField
            label="Price"
            value={formData.price}
            onChange={(e) => handleInputChange("price", e.target.value)}
            fullWidth
            type="number"
            margin="normal"
          />

          <Button variant="outlined" component="label" sx={{ mt: 2, mb: 1 }}>
            Upload Images
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleImageAdd(e.target.files);
                }
              }}
            />
          </Button>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {formData.images.map((img, idx) => (
              <Box key={idx} sx={{ position: "relative" }}>
                <img
                  src={img.url}
                  alt={`img_${idx}`}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    objectFit: "cover",
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleImageRemove(idx)}
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            disabled={uploading}
            variant="contained"
          >
            {uploading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewAddOn}
        onClose={closePreviewDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Preview Add-On</DialogTitle>
        <DialogContent dividers>
          {previewAddOn && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {previewAddOn.title}
              </Typography>
              <Typography gutterBottom>
                {previewAddOn.description || "-"}
              </Typography>
              <Typography gutterBottom>
                Price: ₹{previewAddOn.price.toFixed(2)}
              </Typography>
              {previewAddOn.images && previewAddOn.images.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {previewAddOn.images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`preview_img_${idx}`}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography>No images</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePreviewDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Add-On</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this add-on?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>No</Button>
          <Button
            color="error"
            onClick={async () => {
              const { error } = await supabase
                .from("add_ons")
                .delete()
                .eq("id", toDeleteAddOnId);
              if (error) {
                alert("Delete failed: " + error.message);
              } else {
                alert("Deleted successfully");
                fetchAddOns();
              }
              setDeleteDialogOpen(false);
              setToDeleteAddOnId(null);
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
