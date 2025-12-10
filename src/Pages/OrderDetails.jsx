import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { green, red, amber } from "@mui/material/colors";

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

  function formatDateTime(dt) {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  async function fetchOrder() {
    setLoading(true);

    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !booking) throw error || new Error("Order not found");

      // Fetch customer name + phone
      const { data: cust } = await supabase
        .from("profiles")
        .select("userName, phone")
        .eq("id", booking.userId)
        .maybeSingle();

      // Fetch driver name + phone
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
            .select("name, phone")
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
    addLine("Customer Phone", customer?.phone);
    addLine("Driver", driver?.name);
    addLine("Driver Phone", driver?.phone);
    addLine("Pickup City", order.pickupCity);
    addLine("Drop City", order.dropCity);
    addLine("Pickup Time", formatDateTime(order.pickupTime));
    addLine("Vehicle Model", order.vehicleModel);
    addLine("Vehicle Type", order.vehicleType);
    addLine("Status", order.bookingStatus);
    addLine("PaymentMethod", order.paymentMethod);
    addLine("TotalPrice", order.totalPrice);

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

  // 🔹 Status color helper
  const getStatusColor = () => {
    if (order.bookingStatus?.toLowerCase() === "completed") return green[600];
    if (order.bookingStatus?.toLowerCase() === "cancelled") return red[600];
    if (order.bookingStatus?.toLowerCase() === "upcoming") return amber[700];
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
            <strong>Customer Number:</strong> {customer?.phone || "-"}
          </Typography>

          <Typography>
            <strong>Driver:</strong> {driver?.name || "-"}
          </Typography>
          <Typography>
           <strong>Driver Number:</strong> {driver?.phone || "-"}
          </Typography>

          <Typography>
            <strong>Pickup City:</strong> {order.pickupCity}
          </Typography>

          <Typography>
            <strong>Drop City:</strong> {order.dropCity}
          </Typography>

          <Typography>
            <strong>Pickup Time:</strong> {formatDateTime(order.pickupTime)}
          </Typography>

          <Typography>
            <strong>Vehicle Model:</strong> {order.vehicleModel}
          </Typography>
          <Typography>
            <strong>Vehicle Type:</strong> {order.vehicleType}
          </Typography>

          <Typography>
            <strong>Payment Mode:</strong> {order.paymentMethod || "-"}
          </Typography>

          <Typography>
            <strong>Amount:</strong> ₹{order.totalPrice || 0}
          </Typography>

          <Typography>
            <strong>Status:</strong>{" "}
            <Box component="span" sx={{ color: getStatusColor(), fontWeight: "bold" }}>
              {order.bookingStatus}
            </Box>
          </Typography>

          <Typography color="text.secondary" variant="caption">
            Created At: {formatDateTime(order.created_at)}
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
      </Box>
    </Box>
  );
}
