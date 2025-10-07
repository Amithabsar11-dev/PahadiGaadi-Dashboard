import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import ClearIcon from "@mui/icons-material/Clear";

export default function ZonesClusters() {
  const [zoneName, setZoneName] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [data, setData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    ready,
    value: inputValue,
    setValue,
    suggestions: { status, data: suggestions },
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase
      .from("zones_clusters")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setData(data);
  }

  const handleOpenAdd = () => {
    setZoneName("");
    setClusterName("");
    setLat(null);
    setLng(null);
    setEditing(false);
    setOpenDialog(true);
    setCurrentId(null);
    setValue("");
    clearSuggestions();
    setShowSuggestions(false);
  };

  const handleOpenEdit = (item) => {
    setZoneName(item.zone_name);
    setClusterName(item.cluster_name);
    setLat(item.lat || null);
    setLng(item.lng || null);
    setEditing(true);
    setOpenDialog(true);
    setCurrentId(item.id);
    setValue(item.cluster_name || "");
    clearSuggestions();
    setShowSuggestions(false); // do not show suggestions on edit
  };

  const handleOpenDelete = (id) => setDeleteId(id);
  const handleCloseDelete = () => setDeleteId(null);

  const handleInputChange = (e) => {
    setValue(e.target.value);
    setShowSuggestions(e.target.value.trim() !== "");
  };

  const handleClearInput = () => {
    setValue("");
    clearSuggestions();
    setClusterName("");
    setZoneName("");
    setLat(null);
    setLng(null);
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = async (address) => {
    setValue(address, false);
    clearSuggestions();
    setShowSuggestions(false);
    try {
      const results = await getGeocode({ address });
      if (!results.length) return;
      const place = results[0];
      const { lat: latitude, lng: longitude } = await getLatLng(place);

      const comps = place.address_components;
      let sublocality = null,
        locality = null,
        district = null,
        state = null,
        country = null;

      comps.forEach((c) => {
        const types = c.types;
        if (!sublocality && ["sublocality", "sublocality_level_1", "neighborhood"].some((t) => types.includes(t)))
          sublocality = c.long_name;
        if (!locality && ["locality", "administrative_area_level_3"].some((t) => types.includes(t)))
          locality = c.long_name;
        if (!district && types.includes("administrative_area_level_2")) district = c.long_name;
        if (!state && types.includes("administrative_area_level_1")) state = c.long_name;
        if (!country && types.includes("country")) country = c.long_name;
      });

      const cluster = sublocality || locality || district || state || country || "Unknown";

      let zone = null;
      if (sublocality && locality) zone = locality;
      else if (locality && district) zone = district;
      else if (district) zone = district;
      else if (locality) zone = locality;
      else zone = state || country || "Unknown";

      setClusterName(cluster);
      setZoneName(zone);
      setLat(latitude);
      setLng(longitude);
    } catch (err) {
      console.error(err);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clusterName || !zoneName || lat === null || lng === null) return;

    if (editing) {
      await supabase
        .from("zones_clusters")
        .update({ cluster_name: clusterName, zone_name: zoneName, lat, lng })
        .eq("id", currentId);
    } else {
      await supabase
        .from("zones_clusters")
        .insert([{ cluster_name: clusterName, zone_name: zoneName, lat, lng }]);
    }
    setOpenDialog(false);
    fetchData();
  }

  async function handleDelete() {
    await supabase.from("zones_clusters").delete().eq("id", deleteId);
    setDeleteId(null);
    fetchData();
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" gutterBottom color="primary">
          Zones & Clusters
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpenAdd}>
          Add ZoneCluster
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Zone</TableCell>
              <TableCell>Cluster</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No zones or clusters added
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.zone_name}</TableCell>
                  <TableCell>{item.cluster_name}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleOpenEdit(item)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleOpenDelete(item.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit ZoneCluster" : "Add ZoneCluster"}</DialogTitle>
        <DialogContent>
          <Box sx={{ position: "relative", mt: 1 }}>
            <TextField
              fullWidth
              label="Cluster"
              value={inputValue}
              onChange={handleInputChange}
              disabled={!ready}
              InputProps={{
                endAdornment: clusterName ? (
                  <IconButton onClick={handleClearInput} size="small">
                    <ClearIcon />
                  </IconButton>
                ) : null,
              }}
              sx={{ mb: 2 }}
            />
            {showSuggestions && status === "OK" && (
              <Paper
                sx={{
                  position: "absolute",
                  zIndex: 9999,
                  maxHeight: 200,
                  overflowY: "auto",
                  width: "100%",
                }}
              >
                {suggestions.map(({ place_id, description }) => (
                  <Box
                    key={place_id}
                    sx={{ p: 1, cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
                    onClick={() => handleSelectSuggestion(description)}
                  >
                    {description}
                  </Box>
                ))}
              </Paper>
            )}
          </Box>

          <TextField
            label="Zone"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editing ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onClose={handleCloseDelete}>
        <DialogTitle>Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this zone/cluster?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
