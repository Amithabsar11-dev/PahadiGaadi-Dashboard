import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AllTrips() {
  // Loading states
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Data states
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [routesMap, setRoutesMap] = useState({});

  // States for edit modal
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editSeats, setEditSeats] = useState("");
  const [editDepartureTime, setEditDepartureTime] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [maxSeats, setMaxSeats] = useState(null);

  // States for cancel modal
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const navigate = useNavigate();

  // Fetch drivers and all trips on mount
  useEffect(() => {
    fetchDrivers();
    fetchTrips();
  }, []);

  // Refetch trips when selectedDriver changes
  useEffect(() => {
    if (selectedDriver && selectedDriver.id) {
      fetchTrips(selectedDriver.id);
    } else {
      fetchTrips();
    }
  }, [selectedDriver]);

  // Fetch drivers for dropdown
  async function fetchDrivers() {
    setLoadingDrivers(true);
    const { data, error } = await supabase
      .from("driver_profiles")
      .select("id, name")
      .order("name");
    if (error) {
      console.error("Error fetching drivers:", error);
      setDrivers([]);
    } else {
      setDrivers(data || []);
    }
    setLoadingDrivers(false);
  }

  // Fetch trips, optionally filtered by driverId
  async function fetchTrips(driverId = null) {
    setLoadingTrips(true);
    let query = supabase
      .from("trips")
      .select(
        "id, routeId, departureTime, status, ride_status, seat, userId, vehicleId, vehicleModelId"
      )
      .order("createdAt", { ascending: false });
    if (driverId) query = query.eq("userId", driverId);
    const { data: tripsData, error } = await query;
    if (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
      setRoutesMap({});
    } else {
      setTrips(tripsData || []);
      if (tripsData && tripsData.length > 0) {
        const uniqueRouteIds = [
          ...new Set(tripsData.map((t) => t.routeId).filter(Boolean)),
        ];
        await fetchRoutes(uniqueRouteIds);
      } else {
        setRoutesMap({});
      }
    }
    setLoadingTrips(false);
  }

  // Fetch and map route names
  async function fetchRoutes(routeIds) {
    const { data, error } = await supabase
      .from("routes")
      .select("id, name")
      .in("id", routeIds);
    if (error) {
      console.error("Error fetching routes:", error);
      setRoutesMap({});
    } else {
      const map = {};
      data.forEach((route) => (map[route.id] = route.name));
      setRoutesMap(map);
    }
  }

  // Handler to open edit modal and initialize states
  async function handleOpenEdit(trip) {
    setSelectedTrip(trip);
    setEditSeats(trip.seat || "");

    setEditStatus(trip.status || "upcoming");

    // Format departure time for input type datetime-local
    if (trip.departureTime) {
      const dt = new Date(trip.departureTime);
      const offset = dt.getTimezoneOffset() * 60000;
      setEditDepartureTime(
        new Date(dt.getTime() - offset).toISOString().slice(0, 16)
      );
    } else {
      setEditDepartureTime("");
    }

    // Get the max seats for validation from vehicle seating capacity
    if (trip.vehicleModelId) {
      const { data: vehicleModel, error: vmError } = await supabase
        .from("vehicles_model")
        .select("vehicle_id")
        .eq("id", trip.vehicleModelId)
        .single();

      if (vmError || !vehicleModel) {
        setMaxSeats(null);
      } else {
        const { data: vehicle, error: vError } = await supabase
          .from("vehicles")
          .select("seatingCapacity")
          .eq("id", vehicleModel.vehicle_id)
          .single();

        if (vError || !vehicle) {
          setMaxSeats(null);
        } else {
          setMaxSeats(vehicle.seatingCapacity);
        }
      }
    } else {
      setMaxSeats(null);
    }

    setOpenEditDialog(true);
  }

  // Validate & save edited trip data
  async function handleSaveEdit() {
    if (!selectedTrip) return;

    const seatNumber = Number(editSeats);
    if (maxSeats && seatNumber > maxSeats) {
      alert(`Seats cannot exceed vehicle capacity (${maxSeats}).`);
      return;
    }
    if (seatNumber < 1) {
      alert(`Seats cannot be less than 1.`);
      return;
    }

    let departureIso = null;
    if (editDepartureTime) {
      departureIso = new Date(editDepartureTime).toISOString();
    }

    setLoadingTrips(true);

    const updates = {
      seat: seatNumber,
      status: editStatus,
    };
    if (departureIso) {
      updates.departureTime = departureIso;
    }

    const { error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", selectedTrip.id);

    if (error) {
      alert("Failed to update trip: " + error.message);
    } else {
      alert("Trip updated successfully.");
      fetchTrips(selectedDriver ? selectedDriver.id : null);
    }
    setLoadingTrips(false);
    setOpenEditDialog(false);
    setSelectedTrip(null);
  }

  // Open cancel modal and init state
  function handleCancelClick(trip) {
    setSelectedTrip(trip);
    setCancelReason("");
    setOpenCancelDialog(true);
  }

  // Confirm trip cancellation with reason
  async function handleConfirmCancel() {
    if (!selectedTrip) return;
    if (!cancelReason.trim()) {
      alert("Please provide a cancellation reason.");
      return;
    }
    setLoadingTrips(true);
    const { error } = await supabase
      .from("trips")
      .update({
        ride_status: "cancelled",
        status: "cancelled",
        cancellationReason: cancelReason.trim(),
      })
      .eq("id", selectedTrip.id);

    if (error) {
      alert("Failed to cancel trip: " + error.message);
    } else {
      alert("Trip cancelled successfully.");
      fetchTrips(selectedDriver ? selectedDriver.id : null);
    }
    setLoadingTrips(false);
    setOpenCancelDialog(false);
    setSelectedTrip(null);
  }

  // Handle seat input change with max seat validation
  function handleSeatChange(e) {
    const val = e.target.value;
    if (!val) {
      setEditSeats("");
      return;
    }
    const valNum = Number(val);
    if (maxSeats && valNum > maxSeats) {
      setEditSeats(maxSeats.toString());
    } else if (valNum < 1) {
      setEditSeats("1");
    } else {
      setEditSeats(val);
    }
  }

  return (
    <Box sx={{ mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        All Trips
      </Typography>

      {loadingDrivers ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Autocomplete
          options={drivers}
          getOptionLabel={(option) => option?.name || ""}
          value={selectedDriver}
          onChange={(_, newVal) => setSelectedDriver(newVal)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Driver"
              placeholder="Search driver"
              variant="outlined"
              size="small"
            />
          )}
          clearOnEscape
          sx={{ mb: 3 }}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          noOptionsText="No drivers found"
        />
      )}

      {loadingTrips ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : trips.length === 0 ? (
        <Alert severity="warning">No trips found.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={4}>
          <Table size="medium" aria-label="trips-table" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.light" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Trip ID</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Route Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Departure Time
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Seat</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trips.map((trip) => {
                const isDisabled =
                  trip.ride_status === "cancelled" ||
                  trip.status === "cancelled" ||
                  trip.ride_status === "completed" ||
                  trip.status === "completed";
                return (
                  <TableRow key={trip.id} hover>
                    <TableCell sx={{ wordBreak: "break-word" }}>
                      {trip.id}
                    </TableCell>
                    <TableCell sx={{ wordBreak: "break-word" }}>
                      {trip.routeId
                        ? routesMap[trip.routeId] || "Loading..."
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {trip.departureTime
                        ? new Date(trip.departureTime).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {trip.status || "-"}
                    </TableCell>
                    <TableCell>{trip.seat || "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        sx={{ mr: 1 }}
                        onClick={() => navigate(`/view-trip/${trip.id}`)}
                      >
                        View
                      </Button>

                      {!isDisabled ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                            onClick={() => handleOpenEdit(trip)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleCancelClick(trip)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Typography color="textSecondary">
                          Not Editable
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Modal */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Trip</DialogTitle>
        <DialogContent>
          <TextField
            label="Seats"
            fullWidth
            type="number"
            inputProps={{ min: 1, max: maxSeats || undefined }}
            helperText={maxSeats ? `Max Seats: ${maxSeats}` : ""}
            value={editSeats}
            onChange={handleSeatChange}
            sx={{ mt: 1 }}
          />
          <TextField
            label="Departure Time"
            fullWidth
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={editDepartureTime}
            onChange={(e) => setEditDepartureTime(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              value={editStatus}
              label="Status"
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <MenuItem value="upcoming">Upcoming</MenuItem>
              <MenuItem value="ongoing">Ongoing</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog
        open={openCancelDialog}
        onClose={() => setOpenCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Trip</DialogTitle>
        <DialogContent>
          <Typography>
            Please enter the cancellation reason for this trip:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Cancellation Reason"
            type="text"
            multiline
            minRows={3}
            fullWidth
            variant="outlined"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
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
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
