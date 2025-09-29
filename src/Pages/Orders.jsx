import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  MenuItem,
  InputLabel,
  Select,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  Button,
} from "@mui/material";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function formatDate(dt) {
  if (!dt) return "";
  const date = new Date(dt);
  return date.toLocaleString();
}

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [filters, setFilters] = useState({
    driver: "all",
    customer: "all",
    dateFrom: "",
    dateTo: "",
    zone: "",
    cluster: "",
    category: "",
    vehicle: "all",
    status: "all",
  });

  const [vehicles, setVehicles] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    let bookingQuery = supabase
      .from("bookings")
      .select(
        "id, created_at, bookingStatus, pickupCity, dropCity, pickupTime, dropTime, vehicleModel, vehicleType, vehicleNumber, userId, tripId"
      )
      .order("created_at", { ascending: false });

    // Apply filters if not 'all'
    if (filters.driver !== "all") {
      // filter by driver: need to join with trips
    }
    if (filters.customer !== "all") {
      bookingQuery = bookingQuery.eq("userId", filters.customer);
    }
    if (filters.vehicle !== "all") {
      bookingQuery = bookingQuery.eq("vehicleType", filters.vehicle);
    }
    if (filters.status !== "all") {
      bookingQuery = bookingQuery.eq("bookingStatus", filters.status);
    }
    if (filters.dateFrom) {
      bookingQuery = bookingQuery.gte("pickupTime", filters.dateFrom);
    }
    if (filters.dateTo) {
      bookingQuery = bookingQuery.lte("pickupTime", filters.dateTo);
    }

    let { data: bookingsData, error: bookingsError } = await bookingQuery;

    if (bookingsError) {
      console.error("Bookings fetch error:", bookingsError);
      bookingsData = [];
    }

    setBookings(bookingsData || []);

    // Fetch supporting data for filters
    const userIds = [
      ...new Set((bookingsData || []).map((b) => b.userId).filter(Boolean)),
    ];
    const tripIds = [
      ...new Set((bookingsData || []).map((b) => b.tripId).filter(Boolean)),
    ];

    let { data: tripsData, error: tripsError } = await supabase
      .from("trips")
      .select("id, userId")
      .in("id", tripIds);

    if (tripsError) {
      console.error("Trips fetch error", tripsError);
      tripsData = [];
    }
    setTrips(tripsData || []);

    let { data: customersData, error: customersError } = await supabase
      .from("profiles")
      .select("id, userName")
      .in("id", userIds);

    if (customersError) {
      console.error("Customer fetch error", customersError);
      customersData = [];
    }
    setCustomers(customersData || []);

    const driverIds = [
      ...new Set((tripsData || []).map((t) => t.userId).filter(Boolean)),
    ];

    let { data: driversData, error: driversError } = await supabase
      .from("driver_profiles")
      .select("id, name")
      .in("id", driverIds);

    if (driversError) {
      console.error("Drivers fetch error", driversError);
      driversData = [];
    }
    setDrivers(driversData || []);

    let { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, vehicleType")
      .order("vehicleType");

    if (vehiclesError) {
      console.error("Vehicles fetch error", vehiclesError);
      vehiclesData = [];
    }
    setVehicles(vehiclesData || []);
    setLoading(false);
  }

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleApplyFilters = () => {
    fetchAll();
  };

  const handleClearFilters = () => {
    setFilters({
      driver: "all",
      customer: "all",
      dateFrom: "",
      dateTo: "",
      zone: "",
      cluster: "",
      vehicle: "all",
      status: "all",
    });
    fetchAll();
  };

  function getCustomerName(userId) {
    return customers.find((u) => u.id === userId)?.userName || "Unknown";
  }

  function getDriverIdForBooking(booking) {
    return trips.find((t) => t.id === booking.tripId)?.userId || null;
  }

  function getDriverName(driverId) {
    return drivers.find((d) => d.id === driverId)?.name || "Unknown";
  }

  const filteredBookings = bookings.filter((booking) => {
    if (filters.driver !== "all") {
      const driverId = getDriverIdForBooking(booking);
      if (driverId !== filters.driver) return false;
    }
    if (filters.customer !== "all" && booking.userId !== filters.customer) return false;
    if (filters.dateFrom && booking.pickupTime < filters.dateFrom) return false;
    if (filters.dateTo && booking.pickupTime > filters.dateTo) return false;
    if (filters.zone) {
      if (
        (!booking.pickupCity ||
          !booking.pickupCity.toLowerCase().includes(filters.zone.toLowerCase())) &&
        (!booking.dropCity ||
          !booking.dropCity.toLowerCase().includes(filters.zone.toLowerCase()))
      )
        return false;
    }
    if (filters.cluster) {
      if (!booking.route || !booking.route.toLowerCase().includes(filters.cluster.toLowerCase()))
        return false;
    }
    if (filters.category) {
      if (
        !booking.vehicleType ||
        !booking.vehicleType.toLowerCase().includes(filters.category.toLowerCase())
      )
        return false;
    }
    if (filters.vehicle !== "all" && booking.vehicleType !== filters.vehicle) return false;
    if (filters.status !== "all" && booking.bookingStatus !== filters.status) return false;
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Orders
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
          {/* Driver Filter */}
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="filter-driver-label">Driver</InputLabel>
            <Select
              labelId="filter-driver-label"
              label="Driver"
              value={filters.driver}
              onChange={handleFilterChange("driver")}
            >
              <MenuItem value="all">All</MenuItem>
              {drivers.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Customer Filter */}
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="filter-customer-label">Customer</InputLabel>
            <Select
              labelId="filter-customer-label"
              label="Customer"
              value={filters.customer}
              onChange={handleFilterChange("customer")}
            >
              <MenuItem value="all">All</MenuItem>
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.userName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date From */}
          <TextField
            label="Date From"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateFrom}
            onChange={handleFilterChange("dateFrom")}
            sx={{ minWidth: 150 }}
          />

          {/* Date To */}
          <TextField
            label="Date To"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateTo}
            onChange={handleFilterChange("dateTo")}
            sx={{ minWidth: 150 }}
          />

          {/* Vehicle */}
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="filter-vehicle-label">Vehicle</InputLabel>
            <Select
              labelId="filter-vehicle-label"
              label="Vehicle"
              value={filters.vehicle}
              onChange={handleFilterChange("vehicle")}
            >
              <MenuItem value="all">All</MenuItem>
              {vehicles.map((v) => (
                <MenuItem key={v.id} value={v.vehicleType}>
                  {v.vehicleType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="filter-status-label">Status</InputLabel>
            <Select
              labelId="filter-status-label"
              label="Status"
              value={filters.status}
              onChange={handleFilterChange("status")}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleApplyFilters} disabled={loading}>
            Apply Filters
          </Button>
          <Button variant="outlined" onClick={handleClearFilters} disabled={loading}>
            Clear
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" aria-label="orders table">
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Driver Name</TableCell>
                {/* <TableCell>Created At</TableCell> */}
                <TableCell>Pickup City</TableCell>
                <TableCell>Drop City</TableCell>
                <TableCell>Pickup Time</TableCell>
                {/* <TableCell>Drop Time</TableCell> */}
                <TableCell>Vehicle Model</TableCell>
                <TableCell>Vehicle Type</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((order) => (
                  <TableRow key={order.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/orders/${order.id}`)}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{getCustomerName(order.userId)}</TableCell>
                    <TableCell>{getDriverName(getDriverIdForBooking(order))}</TableCell>
                    {/* <TableCell>{formatDate(order.created_at)}</TableCell> */}
                    <TableCell>{order.pickupCity || "-"}</TableCell>
                    <TableCell>{order.dropCity || "-"}</TableCell>
                    <TableCell>{formatDate(order.pickupTime)}</TableCell>
                    {/* <TableCell>{formatDate(order.dropTime)}</TableCell> */}
                    <TableCell>{order.vehicleModel || "-"}</TableCell>
                    <TableCell>{order.vehicleType || "-"}</TableCell>
                    <TableCell>{order.bookingStatus || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
