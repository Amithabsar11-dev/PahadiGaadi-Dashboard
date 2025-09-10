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
  Switch,
  Tooltip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AllRoutesScreen() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Error fetching routes:", error);
    } else {
      setRoutes(data);
    }
    setLoading(false);
  };

  const toggleRouteStatus = async (routeId, currentStatus) => {
    const { data, error } = await supabase
      .from("routes")
      .update({ isActive: !currentStatus })
      .eq("id", routeId)
      .select();

    if (error) {
      alert("Failed to update status");
      return;
    }

    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId ? { ...r, isActive: data?.[0]?.isActive } : r
      )
    );
  };

  const handleEdit = (route) => {
    navigate("/routes", { state: { route, isEditing: true } });
  };

  const handlePreview = (route) => {
    setPreviewRoute(route);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) {
        console.error("Delete error:", error);
        alert("Failed to delete route");
        return;
      }
      fetchRoutes();
    }
  };

  const handleAddRoute = () => {
    navigate("/routes");
  };

  if (loading) {
    return (
      <Box p={3} display="flex" alignItems="center" gap={1}>
        <CircularProgress size={24} />
        <Typography>Loading routes...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5">All Routes</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddRoute}
        >
          Add Route
        </Button>
      </Box>

      <Paper elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Vehicle Type</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Total Price</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Creator</TableCell>
              {/* <TableCell>Points</TableCell>
              <TableCell>Pricing Details</TableCell> */}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No routes found.
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>{route.name}</TableCell>
                  <TableCell>{route.description}</TableCell>
                  <TableCell>{route.vehicleType}</TableCell>
                  <TableCell>
                    {new Date(route.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>₹ {route.totalprice}</TableCell>
                  <TableCell>
                    <Switch
                      checked={route.isActive}
                      onChange={() =>
                        toggleRouteStatus(route.id, route.isActive)
                      }
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={`${route.createdByName || "Unknown"} (${
                        route.createdByRole || "Role Unknown"
                      })`}
                    >
                      <IconButton size="small">
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  {/* <TableCell>
                    {route.points?.map((pt, i) => (
                      <div key={i}>{pt.name}</div>
                    ))}
                  </TableCell>
                  <TableCell>
                    {route.pricing?.map((p, i) => (
                      <div key={i}>
                        {p.from} → {p.to} — ₹{p.price || p.rate}
                      </div>
                    ))}
                  </TableCell> */}
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEdit(route)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Preview">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handlePreview(route)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(route.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={Boolean(previewRoute)}
        onClose={() => setPreviewRoute(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Route Preview - {previewRoute?.name}</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            <strong>Description:</strong> {previewRoute?.description}
          </Typography>
          <Typography gutterBottom>
            <strong>Vehicle Type:</strong> {previewRoute?.vehicleType}
          </Typography>
          <Typography gutterBottom>
            <strong>Created At:</strong>{" "}
            {new Date(previewRoute?.createdAt).toLocaleString()}
          </Typography>
          <Typography gutterBottom>
            <strong>Active:</strong> {previewRoute?.isActive ? "Yes" : "No"}
          </Typography>
          <Typography gutterBottom>
            <strong>Total Price:</strong> ₹{previewRoute?.totalprice}
          </Typography>
          {/* <Typography gutterBottom>
            <strong>Points:</strong>
            <ul>
              {previewRoute?.points?.map((pt, i) => (
                <li key={i}>{pt.name}</li>
              ))}
            </ul>
          </Typography>
          <Typography gutterBottom>
            <strong>Pricing Details:</strong>
            <ul>
              {previewRoute?.pricing?.map((p, i) => (
                <li key={i}>
                  {p.from} → {p.to} — ₹{p.price || p.rate}
                </li>
              ))}
            </ul>
          </Typography> */}
          <Typography gutterBottom>
            <strong>Created By:</strong> {previewRoute?.createdByName} (
            {previewRoute?.createdByRole})
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewRoute(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
