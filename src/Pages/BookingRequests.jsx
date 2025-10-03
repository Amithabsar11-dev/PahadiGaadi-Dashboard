import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  const [hotelBookings, setHotelBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [availableDriversMap, setAvailableDriversMap] = useState({});
  const [processingMap, setProcessingMap] = useState({});
  const [selectedDriver, setSelectedDriver] = useState({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState({
    type: "",
    bookingId: null,
  });
  const [hotelMap, setHotelMap] = useState({}); // id → hotel name

  // 🔹 fetch trips bookings
  async function fetchBookingRequests(showLoader = false) {
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("bookingStatus", "pending")
      .order("created_at", { ascending: true });

    if (bookingsError) {
      console.error("Failed to load bookings:", bookingsError);
      return;
    }
    setBookings(bookingsData || []);

    const tripIds = [
      ...new Set(bookingsData.map((b) => b.tripId).filter(Boolean)),
    ];
    if (tripIds.length > 0) {
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("id, routeId, departureTime, vehicleModelId, userId, status")
        .in("id", tripIds);

      if (!tripsError) setTrips(tripsData || []);
    }
  }

  // 🔹 fetch hotel bookings
  // 🔹 fetch hotel bookings
  async function fetchHotelBookingRequests() {
    // fetch hotels map first
    const { data: hotelsData, error: hotelsError } = await supabase
      .from("hotels_model") // corrected table name
      .select("id, hotel_name"); // corrected column name

    const hotelMap = {};
    if (!hotelsError && hotelsData) {
      hotelsData.forEach((h) => {
        hotelMap[h.id] = h.hotel_name;
      });
    }

    // fetch hotel bookings
    const { data: hotelBookingData, error: hotelBookingError } = await supabase
      .from("hotel_bookings")
      .select("*")
      .eq("booking_status", "pending")
      .order("created_at", { ascending: true });

    if (!hotelBookingError && hotelBookingData) {
      const bookingsWithName = hotelBookingData.map((b) => ({
        ...b,
        hotelName: hotelMap[b.hotel_id] || "N/A",
      }));
      setHotelBookings(bookingsWithName);
    } else {
      setHotelBookings([]);
    }
  }

  // 🔹 fetch hotels map
  async function fetchHotelsMap() {
    const { data, error } = await supabase
      .from("hotels_model") // corrected table name
      .select("id, hotel_name"); // corrected column name

    if (!error && data) {
      const map = {};
      data.forEach((h) => {
        map[h.id] = h.hotel_name;
      });
      setHotelMap(map);
    }
  }

  // 🔹 fetch available drivers with vehicle model
  // 🔹 fetch available drivers with vehicle model
  // 🔹 fetch available drivers for a booking
  // 🔹 fetch available drivers for a booking (with old conditions)
async function fetchAvailableDriversForBooking(booking) {
  if (!booking) return [];

  const bookingDateUTC = new Date(booking.bookingDate + "T00:00:00Z");
  const dayStart = new Date(bookingDateUTC);
  const dayEnd = new Date(bookingDateUTC);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const tripData = trips.find((t) => t.id === booking.tripId);
  if (!tripData || !tripData.routeId) return [];

  const routeId = tripData.routeId;

  // Candidate trips on the same route and date
  const { data: candidateTrips, error: tripError } = await supabase
    .from("trips")
    .select("id, userId, seat, departureTime, vehicleModelId")
    .eq("routeId", routeId)
    .gte("departureTime", dayStart.toISOString())
    .lte("departureTime", dayEnd.toISOString())
    .not("userId", "is", null);

  if (tripError || !candidateTrips) {
    console.error("Error fetching candidate trips:", tripError);
    return [];
  }
  if (candidateTrips.length === 0) return [];

  const tripIds = candidateTrips.map((t) => t.id);

  // Fetch booked seats for these trips
  const { data: bookingSeats, error: bookingError } = await supabase
    .from("bookings")
    .select("tripId, noOfSeats")
    .in("tripId", tripIds)
    .in("bookingStatus", ["pending", "upcoming"]);

  if (bookingError) {
    console.error("Error fetching booking seats:", bookingError);
    return [];
  }

  const seatsBookedMap = {};
  bookingSeats.forEach((b) => {
    seatsBookedMap[b.tripId] = (seatsBookedMap[b.tripId] || 0) + b.noOfSeats;
  });

  // Only trips with enough available seats
  const sufficientTrips = candidateTrips.filter((trip) => {
    const bookedSeats = seatsBookedMap[trip.id] || 0;
    const remainingSeats = trip.seat - bookedSeats;
    return remainingSeats >= booking.noOfSeats;
  });

  if (sufficientTrips.length === 0) return [];

  // Unique driver IDs from sufficient trips
  const driverIds = [...new Set(sufficientTrips.map((t) => t.userId))];
  if (driverIds.length === 0) return [];

  // Fetch driver profiles
  const { data: driversData, error: driversError } = await supabase
    .from("driver_profiles")
    .select("id, name")
    .in("id", driverIds);

  if (driversError) {
    console.error("Error fetching driver profiles:", driversError);
    return [];
  }

  // Fetch vehicle model names for all trips
  const vehicleModelIds = [
    ...new Set(sufficientTrips.map((t) => t.vehicleModelId).filter(Boolean)),
  ];
  let vehicleModelsMap = {};
  if (vehicleModelIds.length > 0) {
    const { data: vehicleModelsData, error: vehicleModelError } = await supabase
      .from("vehicles_model")
      .select("id, model_name")
      .in("id", vehicleModelIds);

    if (!vehicleModelError && vehicleModelsData) {
      vehicleModelsData.forEach((vm) => {
        vehicleModelsMap[vm.id] = vm.model_name;
      });
    }
  }

  // Attach vehicle model name to drivers
  const driversWithVehicle = driversData.map((driver) => {
    const driverTrip = sufficientTrips.find((t) => t.userId === driver.id);
    const vehicleModelName = driverTrip
      ? vehicleModelsMap[driverTrip.vehicleModelId] || "N/A"
      : "N/A";

    return {
      ...driver,
      vehicle_model: vehicleModelName,
    };
  });

  return driversWithVehicle;
}


  // 🔹 load drivers whenever bookings update
  useEffect(() => {
    async function loadAvailableDrivers() {
      const map = {};
      for (const booking of bookings) {
        const driversForBooking = await fetchAvailableDriversForBooking(
          booking
        );
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

  // 🔹 confirm trip booking
  async function handleConfirmBooking(bookingId) {
    const driverId = selectedDriver[bookingId];
    if (!driverId) {
      alert("Please select a driver first.");
      return;
    }

    setProcessingMap((prev) => ({ ...prev, [bookingId]: true }));

    try {
      const { data: updatedBooking, error: updateError } = await supabase
        .from("bookings")
        .update({ driver_id: driverId, bookingStatus: "upcoming" })
        .eq("id", bookingId)
        .select()
        .single();

      if (updateError || !updatedBooking) {
        console.error("Error updating booking:", updateError);
        alert(
          "Failed to confirm booking: " +
            (updateError?.message || "Unknown error")
        );
        setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
        return;
      }

      const { error: insertError } = await supabase
        .from("driver_bookings")
        .insert({ driver_id: driverId, booking_id: bookingId });

      if (insertError) {
        console.error("Error inserting into driver_bookings:", insertError);
        alert("Failed to record driver booking: " + insertError.message);
        setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
        return;
      }

      const tripId = updatedBooking.tripId;
      if (tripId) {
        const { error: tripUpdateError } = await supabase
          .from("trips")
          .update({ status: "booked" })
          .eq("id", tripId);

        if (tripUpdateError) {
          console.error("Error updating trip status:", tripUpdateError);
          alert("Failed to update trip status: " + tripUpdateError.message);
        }
      }

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSelectedDriver((prev) => ({ ...prev, [bookingId]: "" }));
    } finally {
      setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  // 🔹 cancel trip booking
  async function handleCancelBooking(bookingId) {
    setProcessingMap((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await supabase
        .from("bookings")
        .update({ bookingStatus: "cancelled" })
        .eq("id", bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } finally {
      setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  // 🔹 confirm hotel booking
  async function handleConfirmHotelBooking(bookingId) {
    setProcessingMap((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await supabase
        .from("hotel_bookings")
        .update({ booking_status: "booked" })
        .eq("id", bookingId);
      setHotelBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } finally {
      setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  // 🔹 cancel hotel booking
  async function handleCancelHotelBooking(bookingId) {
    setProcessingMap((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await supabase
        .from("hotel_bookings")
        .update({ booking_status: "cancelled" })
        .eq("id", bookingId);
      setHotelBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } finally {
      setProcessingMap((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  // 🔹 periodic refresh every 3 sec
  useEffect(() => {
    fetchBookingRequests();
    fetchHotelBookingRequests();
    fetchHotelsMap();
    const interval = setInterval(() => {
      fetchBookingRequests();
      fetchHotelBookingRequests();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function findTripByBooking(booking) {
    return trips.find((t) => t.id === booking.tripId);
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Booking Requests
      </Typography>

      {bookings.length === 0 && hotelBookings.length === 0 && (
        <Typography>No pending booking requests</Typography>
      )}

      {/* Trip Bookings */}
      {bookings.length > 0 && (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ p: 2 }}>
            Trip Bookings Pending Approval
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Booking ID</strong>
                </TableCell>
                <TableCell>
                  <strong>Package</strong>
                </TableCell>
                <TableCell>
                  <strong>Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Vehicle(s)</strong>
                </TableCell>
                <TableCell>
                  <strong>No. of Travelers</strong>
                </TableCell>
                <TableCell>
                  <strong>Rate (₹)</strong>
                </TableCell>
                <TableCell>
                  <strong>Select Driver</strong>
                </TableCell>
                <TableCell>
                  <strong>Actions</strong>
                </TableCell>
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
                      {trip
                        ? new Date(trip.departureTime).toLocaleString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {booking.vehicleModel || booking.vehicleType || "N/A"}
                    </TableCell>
                    <TableCell>{booking.noOfSeats || 1}</TableCell>
                    <TableCell>
                      {booking.totalPrice
                        ? booking.totalPrice.toFixed(2)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedDriver[booking.id] || ""}
                        onChange={(e) =>
                          setSelectedDriver((prev) => ({
                            ...prev,
                            [booking.id]: e.target.value,
                          }))
                        }
                        displayEmpty
                        sx={{ minWidth: 160, fontSize: "0.85rem", height: 32 }}
                        disabled={isProcessing}
                      >
                        <MenuItem value="">-- Select driver --</MenuItem>
                        {driversForBooking.map((driver) => (
                          <MenuItem key={driver.id} value={driver.id}>
                            {driver.name} ({driver.vehicle_model || "N/A"})
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setConfirmDialogData({
                              type: "confirmBooking",
                              bookingId: booking.id,
                            });
                            setConfirmDialogOpen(true);
                          }}
                          disabled={isProcessing}
                          size="small"
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            setConfirmDialogData({
                              type: "cancelBooking",
                              bookingId: booking.id,
                            });
                            setConfirmDialogOpen(true);
                          }}
                          disabled={isProcessing}
                          size="small"
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

      {/* Hotel Bookings */}
      {hotelBookings.length > 0 && (
        <TableContainer component={Paper}>
          <Typography variant="h6" sx={{ p: 2 }}>
            Hotel Bookings Pending Approval
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Booking ID</strong>
                </TableCell>
                <TableCell>
                  <strong>Hotel</strong>
                </TableCell>
                <TableCell>
                  <strong>Check-in Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Check-out Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Adults</strong>
                </TableCell>
                <TableCell>
                  <strong>Children</strong>
                </TableCell>
                <TableCell>
                  <strong>Total Price (₹)</strong>
                </TableCell>
                <TableCell>
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hotelBookings.map((booking) => {
                const isProcessing = !!processingMap[booking.id];
                return (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>{booking.hotelName}</TableCell>

                    <TableCell>
                      {new Date(booking.checkin_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.checkout_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{booking.adults}</TableCell>
                    <TableCell>{booking.children}</TableCell>
                    <TableCell>
                      {booking.total_price
                        ? booking.total_price.toFixed(2)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setConfirmDialogData({
                              type: "confirmHotel",
                              bookingId: booking.id,
                            });
                            setConfirmDialogOpen(true);
                          }}
                          disabled={isProcessing}
                          size="small"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            setConfirmDialogData({
                              type: "cancelHotel",
                              bookingId: booking.id,
                            });
                            setConfirmDialogOpen(true);
                          }}
                          disabled={isProcessing}
                          size="small"
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

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography>
            {(() => {
              switch (confirmDialogData.type) {
                case "confirmBooking":
                  return "Are you sure you want to confirm this trip booking?";
                case "cancelBooking":
                  return "Are you sure you want to cancel this trip booking?";
                case "confirmHotel":
                  return "Are you sure you want to approve this hotel booking?";
                case "cancelHotel":
                  return "Are you sure you want to cancel this hotel booking?";
                default:
                  return "Are you sure?";
              }
            })()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>No</Button>
          <Button
            color="primary"
            onClick={async () => {
              setConfirmDialogOpen(false);
              const id = confirmDialogData.bookingId;
              switch (confirmDialogData.type) {
                case "confirmBooking":
                  await handleConfirmBooking(id);
                  break;
                case "cancelBooking":
                  await handleCancelBooking(id);
                  break;
                case "confirmHotel":
                  await handleConfirmHotelBooking(id);
                  break;
                case "cancelHotel":
                  await handleCancelHotelBooking(id);
                  break;
              }
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
