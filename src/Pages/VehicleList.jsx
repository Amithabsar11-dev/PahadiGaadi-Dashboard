import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function VehicleList() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewModel, setPreviewModel] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles_model")
        .select(`
          *,
          vehicles(vehicleType)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("fetchModels error:", error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model) => {
    navigate("/vehicles", { state: { model, isEditing: true } });
  };

  const handlePreview = (model) => {
    setPreviewModel(model);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle model?")) {
      const { error } = await supabase.from("vehicles_model").delete().eq("id", id);
      if (error) {
        alert("Failed to delete vehicle model");
        return;
      }
      // Refetch after delete for consistency
      fetchModels();
    }
  };

  const handleAddVehicle = () => {
    navigate("/vehicles");
  };

  if (loading) {
    return (
      <Box
        sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (models.length === 0) {
    return (
      <Typography variant="h6" align="center" sx={{ mt: 4 }}>
        No vehicles available.
      </Typography>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">All Vehicle Models</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddVehicle}
        >
          Add Vehicle
        </Button>
      </Box>

      <Paper elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Model Name</TableCell>
              <TableCell>Vehicle Type</TableCell>
              {/* <TableCell>Rating</TableCell> */}
              <TableCell>Seater Range</TableCell>
              <TableCell>Service Name</TableCell>
              <TableCell>Vehicle Category</TableCell>
              <TableCell>AC Type</TableCell>
              {/* <TableCell>Has Carrier</TableCell> */}
              {/* <TableCell>Created At</TableCell> */}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>{model.model_name || "Untitled Model"}</TableCell>
                <TableCell>{model.vehicles?.vehicleType || "N/A"}</TableCell>
                {/* <TableCell>{model.rating ?? "N/A"}</TableCell> */}
                <TableCell>{model.seater_range || "N/A"}</TableCell>
                <TableCell>{model.service_name || "N/A"}</TableCell>
                <TableCell>{model.vehicle_category || "N/A"}</TableCell>
                <TableCell>{model.ac_type || "N/A"}</TableCell>
                {/* <TableCell>{model.has_carrier ? "Yes" : "No"}</TableCell> */}
                {/* <TableCell>{new Date(model.created_at).toLocaleString()}</TableCell> */}
                <TableCell align="center">
                  <Tooltip title="Edit">
                    <IconButton size="small" color="primary" onClick={() => handleEdit(model)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Preview">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handlePreview(model)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(model.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={Boolean(previewModel)}
        onClose={() => setPreviewModel(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Vehicle Model Preview - {previewModel?.model_name}</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            <strong>Vehicle Type:</strong> {previewModel?.vehicles?.vehicleType || "N/A"}
          </Typography>
          {/* <Typography gutterBottom>
            <strong>Rating:</strong> {previewModel?.rating ?? "N/A"}
          </Typography> */}
          <Typography gutterBottom>
            <strong>Seater Range:</strong> {previewModel?.seater_range || "N/A"}
          </Typography>
          <Typography gutterBottom>
            <strong>Service Name:</strong> {previewModel?.service_name || "N/A"}
          </Typography>
          <Typography gutterBottom>
            <strong>Vehicle Category:</strong> {previewModel?.vehicle_category || "N/A"}
          </Typography>
          <Typography gutterBottom>
            <strong>AC Type:</strong> {previewModel?.ac_type || "N/A"}
          </Typography>
          {/* <Typography gutterBottom>
            <strong>Has Carrier:</strong> {previewModel?.has_carrier ? "Yes" : "No"}
          </Typography> */}
          {previewModel?.image_url && (
            <Box
              component="img"
              src={previewModel.image_url}
              alt={previewModel.model_name}
              sx={{ width: "100%", maxHeight: 300, objectFit: "contain", mt: 2 }}
            />
          )}
          <Typography gutterBottom sx={{ mt: 2 }}>
            <strong>Created At:</strong>{" "}
            {new Date(previewModel?.created_at).toLocaleString()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewModel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
