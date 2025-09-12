import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from "@mui/material";
import { supabase } from "../lib/supabase";

export default function BookingRequests() {
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [availableDriversMap, setAvailableDriversMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingMap, setProcessingMap] = useState({});
  const [selectedDriver, setSelectedDriver] = useState({});

  // Fetch bookings and related trips
  async function fetchBookingRequests() {
    setLoading(true);
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("bookingStatus", "pending")
      .order("created_at", { ascending: true });

    if (bookingsError) {
      console.error("Failed to load bookings:", bookingsError);
      setLoading(false);
      return;
    }
    setBookings(bookingsData || []);

    // Fetch related trips by tripId
    const tripIds = [...new Set(bookingsData.map((b) => b.tripId).filter(Boolean))];
    if (tripIds.length > 0) {
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("id, routeId, departureTime, vehicleModelId, userId, status")
        .in("id", tripIds);

      if (tripsError) {
        console.error("Failed to load trips:", tripsError);
        setTrips([]);
      } else {
        setTrips(tripsData || []);
      }
    } else {
      setTrips([]);
    }

    setLoading(false);
  }

  // Fetch drivers available for booking's route and departure date
  async function fetchAvailableDriversForBooking(booking) {
    const trip = trips.find((t) => t.id === booking.tripId);
    if (!trip || !trip.routeId || !trip.departureTime) return [];

    const departureDate = new Date(trip.departureTime);
    // Set UTC day start and end for filtering
    const dayStart = new Date(departureDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(departureDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Query trips on same route and date with non-null userId (driver)
    const { data, error } = await supabase
      .from("trips")
      .select("userId")
      .eq("routeId", trip.routeId)
      .gte("departureTime", dayStart.toISOString())
      .lte("departureTime", dayEnd.toISOString())
      .not("userId", "is", null);

    if (error) {
      console.error("Error fetching drivers for booking:", error);
      return [];
    }

    const driverIds = [...new Set(data.map((d) => d.userId))];
    if (driverIds.length === 0) return [];

    // Fetch driver profiles by driverIds (userId)
    const { data: driversData, error: driversError } = await supabase
      .from("driver_profiles")
      .select("id, name")
      .in("id", driverIds);

    if (driversError) {
      console.error("Error fetching driver profiles:", driversError);
      return [];
    }
    return driversData || [];
  }

  // Load available drivers per booking after bookings and trips are loaded
  useEffect(() => {
    async function loadAvailableDrivers() {
      const map = {};
      for (const booking of bookings) {
        const driversForBooking = await fetchAvailableDriversForBooking(booking);
        map[booking.id] = driversForBooking;
      }
      setAvailableDriversMap(map);
    }
    if (bookings.length > 0 && trips.length > 0) {
      loadAvailableDrivers();
    } else {
      setAvailableDriversMap({});
    }
  }, [bookings, trips]);

  // Confirm booking by assigning selected driver and set bookingStatus to "upcoming"
  async function handleConfirmBooking(bookingId) {
    const driverId = selectedDriver[bookingId];
    if (!driverId) {
      alert("Please select a driver first.");
      return;
    }
    setProcessingMap((prev) => ({ ...prev, [bookingId]: true }));
    try {
      // Update booking with driver and set status upcoming
      const { data: updatedBooking, error: updateError } = await supabase
        .from("bookings")
        .update({
          driver_id: driverId,
          bookingStatus: "upcoming",
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (updateError || !updatedBooking) {
        console.error("Error updating booking:", updateError);
        alert("Failed to confirm booking: " + (updateError?.message || "Unknown error"));
        setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
        return;
      }

      // Insert into driver_bookings
      const { error: insertError } = await supabase
        .from("driver_bookings")
        .insert({
          driver_id: driverId,
          booking_id: bookingId,
        });

      if (insertError) {
        console.error("Error inserting into driver_bookings:", insertError);
        alert("Failed to record driver booking: " + insertError.message);
        setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
        return;
      }

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSelectedDriver((prev) => ({ ...prev, [bookingId]: "" }));
    } catch (err) {
      console.error("Unexpected error confirming booking:", err);
      alert("Unexpected error: " + err.message);
    } finally {
      setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  // Cancel booking by setting bookingStatus to "cancelled"
  async function handleCancelBooking(bookingId) {
    const confirmCancel = window.confirm("Are you sure you want to cancel this booking?");
    if (!confirmCancel) return;

    setProcessingMap((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          bookingStatus: "cancelled",
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (error || !data) {
        console.error("Error cancelling booking:", error);
        alert("Failed to cancel booking: " + (error?.message || "Unknown error"));
        setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
        return;
      }

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSelectedDriver((prev) => ({ ...prev, [bookingId]: "" }));
    } catch (err) {
      console.error("Unexpected error cancelling booking:", err);
      alert("Unexpected error: " + err.message);
    } finally {
      setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  // Subscribe realtime updates to refresh bookings on changes
  useEffect(() => {
    fetchBookingRequests();
    const bookingChannel = supabase
      .channel("booking-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: "bookingStatus=eq.pending",
        },
        () => {
          fetchBookingRequests();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, []);

  // Helper to find trip by booking
  function findTripByBooking(booking) {
    return trips.find((t) => t.id === booking.tripId);
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Booking Requests
      </Typography>
      {loading && <CircularProgress />}
      {!loading && bookings.length === 0 && <Typography>No pending booking requests</Typography>}
      {!loading && bookings.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Booking ID</strong></TableCell>
                <TableCell><strong>Package</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>No. of Travelers</strong></TableCell>
                <TableCell><strong>Rate (₹)</strong></TableCell>
                <TableCell><strong>Select Driver</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => {
                const trip = findTripByBooking(booking);
                const driversForBooking = availableDriversMap[booking.id] || [];
                const isProcessing = !!processingMap[booking.id];

                return (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>{booking.route || "N/A"}</TableCell>
                    <TableCell>
                      {trip ? new Date(trip.departureTime).toLocaleString() : "N/A"}
                    </TableCell>
                    <TableCell>{booking.noOfSeats || 1}</TableCell>
                    <TableCell>{booking.totalPrice || "N/A"}</TableCell>
                    <TableCell>
                      <Select
                        value={selectedDriver[booking.id] || ""}
                        onChange={(e) =>
                          setSelectedDriver((prev) => ({ ...prev, [booking.id]: e.target.value }))
                        }
                        displayEmpty
                        sx={{ minWidth: 160, fontSize: "0.85rem", height: 32 }}
                        disabled={isProcessing}
                      >
                        <MenuItem value="">-- Select a driver --</MenuItem>
                        {driversForBooking.map((driver) => (
                          <MenuItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleConfirmBooking(booking.id)}
                          disabled={isProcessing}
                          size="small"
                          sx={{ minWidth: 100, fontSize: "0.75rem", padding: "4px 8px" }}
                        >
                          {isProcessing ? "Processing..." : "Confirm"}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={isProcessing}
                          size="small"
                          sx={{ minWidth: 100, fontSize: "0.75rem", padding: "4px 8px" }}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
