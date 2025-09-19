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
import { Edit, Visibility, Delete } from "@mui/icons-material";

export default function ZonesClusters() {
  const [zoneName, setZoneName] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [data, setData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

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
    setEditing(false);
    setOpenDialog(true);
    setCurrentId(null);
  };

  const handleOpenEdit = (item) => {
    setZoneName(item.zone_name);
    setClusterName(item.cluster_name);
    setEditing(true);
    setOpenDialog(true);
    setCurrentId(item.id);
  };

  const handleOpenPreview = (item) => setPreviewItem(item);

  const handleClosePreview = () => setPreviewItem(null);

  const handleOpenDelete = (id) => setDeleteId(id);

  const handleCloseDelete = () => setDeleteId(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!zoneName || !clusterName) return;
    if (editing) {
      await supabase
        .from("zones_clusters")
        .update({ zone_name: zoneName, cluster_name: clusterName })
        .eq("id", currentId);
    } else {
      await supabase
        .from("zones_clusters")
        .insert([{ zone_name: zoneName, cluster_name: clusterName }]);
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
      <Typography variant="h4" gutterBottom color="primary">
        Zones & Clusters
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleOpenAdd}>
          Add ZoneCluster
        </Button>
      </Box>
      {/* Table Display */}
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
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleOpenDelete(item.id)}
                    >
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editing ? "Edit ZoneCluster" : "Add ZoneCluster"}
        </DialogTitle>
        <DialogContent>
          <form>
            <TextField
              label="Cluster Name"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Zone Name"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              fullWidth
              sx={{ mt: 2, mb: 2 }}
            />
          </form>
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
          <Typography>
            Are you sure you want to delete this zone/cluster?
          </Typography>
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
