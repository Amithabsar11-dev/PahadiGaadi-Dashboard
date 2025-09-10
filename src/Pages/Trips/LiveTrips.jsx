import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { supabase } from "../../lib/supabase";

export default function LiveTrips() {
  const [loading, setLoading] = useState(true);
  const [liveTrips, setLiveTrips] = useState([]);
  const [routesMap, setRoutesMap] = useState({}); // routeId to routeName map

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editSeats, setEditSeats] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);

  // States for cancel dialog and reason input
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchLiveTrips();
  }, []);

  async function fetchLiveTrips() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .in("ride_status", ["in_progress", "at_pickup"])
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Error fetching live trips:", error);
      setLiveTrips([]);
      setRoutesMap({});
    } else {
      setLiveTrips(data);

      // Fetch routes for unique routeIds
      const uniqueRouteIds = [
        ...new Set((data || []).map((trip) => trip.routeId).filter(Boolean)),
      ];
      if (uniqueRouteIds.length > 0) {
        fetchRouteNames(uniqueRouteIds);
      } else {
        setRoutesMap({});
      }
    }
    setLoading(false);
  }

  // Fetch route names and build map
  async function fetchRouteNames(routeIds) {
    const { data, error } = await supabase
      .from("routes")
      .select("id, name")
      .in("id", routeIds);

    if (error) {
      console.error("Error fetching routes:", error);
      setRoutesMap({});
    } else {
      const map = {};
      (data || []).forEach((route) => {
        map[route.id] = route.name || "Unknown Route";
      });
      setRoutesMap(map);
    }
  }

  // Handle opening Edit Seats dialog
  const handleOpenEditSeats = (trip) => {
    setSelectedTrip(trip);
    setEditSeats(trip.seat || "");
    setOpenEditDialog(true);
  };

  // Handle saving seats edit
  const handleSaveEditSeats = async () => {
    if (!selectedTrip) return;
    setLoading(true);
    const { error } = await supabase
      .from("trips")
      .update({ seat: editSeats })
      .eq("id", selectedTrip.id);

    if (error) {
      alert("Failed to update seats: " + error.message);
    } else {
      alert("Seats updated successfully");
      fetchLiveTrips();
    }
    setOpenEditDialog(false);
    setLoading(false);
  };

  // Open cancel dialog and reset cancellation reason
  const handleCancelTripClick = (trip) => {
    setSelectedTrip(trip);
    setCancelReason("");
    setOpenCancelDialog(true);
  };

  // Confirm cancel after entering cancellation reason
  const handleConfirmCancel = async () => {
    if (!selectedTrip) return;

    if (!cancelReason.trim()) {
      alert("Please enter a cancellation reason.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("trips")
      .update({
        ride_status: "cancelled",
        cancellationReason: cancelReason.trim(),
      })
      .eq("id", selectedTrip.id);

    if (error) {
      alert("Failed to cancel trip: " + error.message);
    } else {
      alert("Trip cancelled successfully.");
      fetchLiveTrips();
    }
    setLoading(false);
    setOpenCancelDialog(false);
    setSelectedTrip(null);
    setCancelReason("");
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Live Trips
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : liveTrips.length === 0 ? (
        <Typography>No live trips found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" aria-label="live trips table">
            <TableHead>
              <TableRow>
                <TableCell>Trip ID</TableCell>
                <TableCell>Route Name</TableCell> {/* Updated to Route Name */}
                <TableCell>Seat</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Departure Time</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {liveTrips.map((trip) => (
                <TableRow key={trip.id} hover>
                  <TableCell>{trip.id}</TableCell>
                  <TableCell>
                    {trip.routeId ? routesMap[trip.routeId] || "Loading..." : "-"}
                  </TableCell>
                  <TableCell>{trip.seat || "-"}</TableCell>
                  <TableCell>{trip.ride_status}</TableCell>
                  <TableCell>
                    {trip.departureTime
                      ? new Date(trip.departureTime).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenEditSeats(trip)}
                      sx={{ mr: 1 }}
                    >
                      Edit Seats
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => handleCancelTripClick(trip)}
                    >
                      Cancel Trip
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Seats Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Edit Trip Seats</DialogTitle>
        <DialogContent>
          <TextField
            label="Seats"
            fullWidth
            value={editSeats}
            onChange={(e) => setEditSeats(e.target.value)}
            type="number"
            inputProps={{ min: 1 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEditSeats} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Trip Reason Dialog */}
      <Dialog
        open={openCancelDialog}
        onClose={() => setOpenCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Trip</DialogTitle>
        <DialogContent>
          <Typography>Please enter the cancellation reason for this trip.</Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Cancellation Reason"
            type="text"
            fullWidth
            multiline
            minRows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
          >
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
