import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { green } from "@mui/material/colors";
import { red } from "@mui/material/colors";
import { amber } from "@mui/material/colors";

import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    setLoading(true);

    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !booking) {
        throw error || new Error("Order not found");
      }

      const { data: cust } = await supabase
        .from("profiles")
        .select("userName")
        .eq("id", booking.userId)
        .maybeSingle();

      let drv = null;
      if (booking.tripId) {
        const { data: trip } = await supabase
          .from("trips")
          .select("userId")
          .eq("id", booking.tripId)
          .maybeSingle();
        if (trip?.userId) {
          const { data: dprof } = await supabase
            .from("driver_profiles")
            .select("name")
            .eq("id", trip.userId)
            .maybeSingle();
          drv = dprof;
        }
      }

      setOrder(booking);
      setCustomer(cust);
      setDriver(drv);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to fetch order");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!order) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Order Report", 14, 22);
    doc.setLineWidth(0.5);
    doc.line(14, 26, 196, 26);

    doc.setFontSize(12);
    let y = 36;

    const addLine = (label, value) => {
      doc.text(`${label}:`, 14, y);
      doc.text(String(value || "-"), 50, y);
      y += 8;
    };

    addLine("Booking ID", order.id);
    addLine("Customer", customer?.userName);
    addLine("Driver", driver?.name);
    addLine("Pickup City", order.pickupCity);
    addLine("Drop City", order.dropCity);
    addLine("Pickup Time", order.pickupTime);
    addLine("Drop Time", order.dropTime);
    addLine("Vehicle Model", order.vehicleModel);
    addLine("Vehicle Type", order.vehicleType);
    addLine("Status", order.bookingStatus);
    addLine("Created At", new Date(order.created_at).toLocaleString());

    doc.save(`order_${order.id}.pdf`);
  }

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );

  if (!order)
    return (
      <Box sx={{ p: 5, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          No Order Found
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );

  // Status color helper
  const getStatusColor = () => {
    if (order.bookingStatus.toLowerCase() === "completed") return green[600];
    if (order.bookingStatus.toLowerCase() === "cancelled") return red[600];
    if (order.bookingStatus.toLowerCase() === "pending") return amber[700];
    return "text.primary";
  };

  return (
    <Box sx={{ p: 4, maxWidth: 700, mx: "auto" }}>
      <Typography variant="h4" gutterBottom color="primary.main" fontWeight="bold">
        Order Details
      </Typography>

      <Paper sx={{ p: 3, mb: 3, boxShadow: 3 }}>
        <Stack spacing={1.5}>
          <Typography>
            <strong>Booking ID:</strong> {order.id}
          </Typography>
          <Typography>
            <strong>Customer:</strong> {customer?.userName || "-"}
          </Typography>
          <Typography>
            <strong>Driver:</strong> {driver?.name || "-"}
          </Typography>
          <Typography>
            <strong>Pickup City:</strong> {order.pickupCity}
          </Typography>
          <Typography>
            <strong>Drop City:</strong> {order.dropCity}
          </Typography>
          <Typography>
            <strong>Pickup Time:</strong> {order.pickupTime}
          </Typography>
          <Typography>
            <strong>Drop Time:</strong> {order.dropTime}
          </Typography>
          <Typography>
            <strong>Vehicle Model:</strong> {order.vehicleModel}
          </Typography>
          <Typography>
            <strong>Vehicle Type:</strong> {order.vehicleType}
          </Typography>
          <Typography>
            <strong>Status:</strong>{" "}
            <Box component="span" sx={{ color: getStatusColor(), fontWeight: "bold" }}>
              {order.bookingStatus}
            </Box>
          </Typography>
          <Typography color="text.secondary" variant="caption">
            Created At: {new Date(order.created_at).toLocaleString()}
          </Typography>
        </Stack>
      </Paper>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          color="primary"
          onClick={downloadReport}
        >
          Download Report
        </Button>
        {/* Uncomment if you want WhatsApp share */}
        {/* <Button variant="outlined" color="success" onClick={shareViaWhatsApp}>
          Share on WhatsApp
        </Button> */}
      </Box>
    </Box>
  );
}
