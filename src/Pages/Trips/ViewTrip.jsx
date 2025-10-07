import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function ViewTrip() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [driverName, setDriverName] = useState("");
  const [routeName, setRouteName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const fetchTrip = async () => {
    setLoading(true);

    // Fetch trip details
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !tripData) {
      console.error("Error fetching trip:", tripError);
      setLoading(false);
      return;
    }
    setTrip(tripData);

    // Fetch driver name
    if (tripData.userId) {
      const { data: driverData } = await supabase
        .from("driver_profiles")
        .select("name")
        .eq("id", tripData.userId)
        .single();
      setDriverName(driverData?.name || "-");
    }

    // Fetch route name
    if (tripData.routeId) {
      const { data: routeData } = await supabase
        .from("routes")
        .select("name")
        .eq("id", tripData.routeId)
        .single();
      setRouteName(routeData?.name || "-");
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!trip) {
    return (
      <Box sx={{ mt: 5, textAlign: "center" }}>
        <Typography variant="h6">Trip not found</Typography>
        <Typography
          variant="body2"
          color="primary"
          sx={{ mt: 2, cursor: "pointer" }}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Typography>
      </Box>
    );
  }

  // Robustly parse trip segments
  let segments = [];
  if (trip.trip_segments) {
    try {
      segments =
        typeof trip.trip_segments === "string"
          ? JSON.parse(trip.trip_segments)
          : trip.trip_segments;
    } catch (err) {
      console.error("Error parsing trip_segments:", err, trip.trip_segments);
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom>
        🛣️ Trip Details
      </Typography>

      {/* General Info */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          General Info
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Typography><strong>Trip ID:</strong> {trip.id}</Typography>
        <Typography><strong>Driver:</strong> {driverName}</Typography>
        <Typography><strong>Route:</strong> {routeName}</Typography>
        <Typography>
          <strong>Departure Time:</strong>{" "}
          {trip.departureTime ? new Date(trip.departureTime).toLocaleString() : "-"}
        </Typography>
        <Typography>
          <strong>Arrival Time:</strong>{" "}
          {trip.arrivalTime ? new Date(trip.arrivalTime).toLocaleString() : "-"}
        </Typography>
        <Typography><strong>Trip Type:</strong> {trip.tripType || "-"}</Typography>
        <Typography><strong>Vehicle Number:</strong> {trip.vehicle_number || "-"}</Typography>
        <Typography><strong>Seats:</strong> {trip.seat || "-"}</Typography>
        <Typography><strong>Status:</strong> {trip.status || "-"}</Typography>
        <Typography><strong>Ride Status:</strong> {trip.ride_status || "-"}</Typography>
        {trip.cancellationReason && (
          <Typography><strong>Cancellation Reason:</strong> {trip.cancellationReason}</Typography>
        )}
      </Paper>

      {/* Trip Segments Timeline */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
        <Typography variant="h6" gutterBottom>
          Trip Segments
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {segments.length === 0 ? (
          <Typography>No segments recorded.</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {segments.map((seg, idx) => (
              <Box
                key={seg.id || idx}
                sx={{
                  borderLeft: "2px solid #1976d2",
                  pl: 2,
                  position: "relative",
                  "&:before": {
                    content: '""',
                    position: "absolute",
                    left: -7,
                    top: 0,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: "#1976d2",
                  },
                }}
              >
                <Typography variant="subtitle2" color="textSecondary">
                  Segment {idx + 1}
                </Typography>
                <Typography><strong>From:</strong> {seg.from}</Typography>
                <Typography><strong>To:</strong> {seg.to}</Typography>
                <Typography>
                  <strong>Distance:</strong> {seg.distance_km || "-"} km
                </Typography>
                <Typography>
                  <strong>Duration:</strong> {seg.duration || "-"}
                </Typography>
                <Typography>
                  <strong>Recorded At:</strong>{" "}
                  {seg.recordedAt ? new Date(seg.recordedAt).toLocaleString() : "-"}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Box sx={{ textAlign: "center", mt: 2 }}>
        <Typography
          variant="body2"
          color="primary"
          sx={{ cursor: "pointer" }}
          onClick={() => navigate(-1)}
        >
          Back to All Trips
        </Typography>
      </Box>
    </Box>
  );
}
