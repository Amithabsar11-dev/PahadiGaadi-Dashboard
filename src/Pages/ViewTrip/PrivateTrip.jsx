import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import { supabase } from "../../lib/supabase";

export default function PrivateTrip() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [driversMap, setDriversMap] = useState({});
  const [routesMap, setRoutesMap] = useState({});
  const [bookings, setBookings] = useState([]);
  const [customersMap, setCustomersMap] = useState({});

  useEffect(() => {
    fetchPrivateTrips();
  }, []);

  async function fetchPrivateTrips() {
    setLoading(true);

    // 1. Fetch private trips (Private Taxi or Private Bus)
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("id, userId, routeId, departureTime, arrivalTime, ride_status, status")
      .in("tripType", ["Private Taxi", "Private Bus"])
      .order("createdAt", { ascending: false });

    if (tripError) {
      console.error("Error fetching private trips:", tripError);
      setTrips([]);
      setLoading(false);
      return;
    }
    setTrips(tripData || []);

    // 2. Drivers map
    const driverIds = [...new Set((tripData || []).map(t => t.userId).filter(Boolean))];
    if (driverIds.length > 0) {
      const { data: drivers, error: driversErr } = await supabase
        .from("driver_profiles")
        .select("id, name")
        .in("id", driverIds);
      if (!driversErr) {
        const map = {};
        drivers.forEach(d => (map[d.id] = d.name));
        setDriversMap(map);
      }
    }

    // 3. Routes map
    const routeIds = [...new Set((tripData || []).map(t => t.routeId).filter(Boolean))];
    if (routeIds.length > 0) {
      const { data: routes, error: routesErr } = await supabase
        .from("routes")
        .select("id, name, points")
        .in("id", routeIds);
      if (!routesErr) {
        const map = {};
        routes.forEach(r => (map[r.id] = r));
        setRoutesMap(map);
      }
    }

    // 4. Bookings for these trips
    const tripIds = tripData.map(t => t.id);
    const { data: bookingsData, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, userId, tripId, pickupTime, pickupCity, dropCity, dropTime")
      .in("tripId", tripIds);

    if (!bookingsErr) {
      setBookings(bookingsData || []);
      // 5. Customers map
      const customerIds = [...new Set(bookingsData.map(b => b.userId).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: customers, error: customersErr } = await supabase
          .from("profiles")
          .select("id, userName")
          .in("id", customerIds);
        if (!customersErr) {
          const map = {};
          customers.forEach(c => (map[c.id] = c.userName));
          setCustomersMap(map);
        }
      }
    } else {
      setBookings([]);
      setCustomersMap({});
    }

    setLoading(false);
  }

  // Flatten bookings into rows, merging in trip/driver/route/customer info
  const rows = bookings.map(b => {
    const trip = trips.find(t => t.id === b.tripId);
    if (!trip) return null;
    const route = routesMap[trip.routeId];
    function getPointName(point) {
      if (!point) return "Unknown";
      if (typeof point === "string") return point;
      if (typeof point === "object")
        return point.name || point.address || point.city || JSON.stringify(point);
      return String(point);
    }
    const points = Array.isArray(route?.points) ? route.points : [];
    const source = points.length > 0 ? getPointName(points[0]) : "Unknown";
    const destination =
      points.length > 1 ? getPointName(points[points.length - 1]) : "Unknown";
    return {
      tripId: trip.id,
      source,
      destination,
      driverName: driversMap[trip.userId] || "Unknown",
      customerName: customersMap[b.userId] || "Unknown",
      pickupCity: b.pickupCity || "-",
      dropCity: b.dropCity || "-",
      pickupTime: b.pickupTime ? new Date(b.pickupTime).toLocaleTimeString() : "-",
      dropTime: b.dropTime ? new Date(b.dropTime).toLocaleTimeString() : "-",
      departureTime: trip.departureTime ? new Date(trip.departureTime).toLocaleString() : "-",
      arrivalTime: trip.arrivalTime ? new Date(trip.arrivalTime).toLocaleString() : "-",
      ride_status: trip.ride_status || "-",
      status: trip.status || "-"
    };
  }).filter(Boolean);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Private Trip Details
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ p: 2 }}>
          <Table size="small" aria-label="private trips table" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Trip ID</TableCell>
                <TableCell>Source / Destination</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Pickup City</TableCell>
                <TableCell>Pickup Time</TableCell>
                <TableCell>Drop City</TableCell>
                <TableCell>Drop Time</TableCell>
                <TableCell>Trip Departure</TableCell>
                <TableCell>Trip Arrival</TableCell>
                <TableCell>Ride Status</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No private bookings found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={row.tripId + "-" + row.customerName + "-" + idx} hover>
                    <TableCell>{row.tripId}</TableCell>
                    <TableCell>{`${row.source} / ${row.destination}`}</TableCell>
                    <TableCell>{row.driverName}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.pickupCity}</TableCell>
                    <TableCell>{row.pickupTime}</TableCell>
                    <TableCell>{row.dropCity}</TableCell>
                    <TableCell>{row.dropTime}</TableCell>
                    <TableCell>{row.departureTime}</TableCell>
                    <TableCell>{row.arrivalTime}</TableCell>
                    <TableCell>{row.ride_status}</TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
