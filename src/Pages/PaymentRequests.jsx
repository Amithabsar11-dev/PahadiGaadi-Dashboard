import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";

export default function PaymentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(null);
  const [error, setError] = useState(null);

  const [openQR, setOpenQR] = useState(false);
  const [qrData, setQrData] = useState(null);

  // Fetch all pending UPI bookings
  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, userId, totalPrice, paymentStatus, paymentMethod")
      .eq("paymentMethod", "UPI")
      .eq("paymentStatus", "pending")
      .order("created_at", { ascending: false });

    if (error) console.log("Fetch error:", error);

    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Generate payment link + QR
  const generateLink = async (bookingId) => {
    try {
      setLinkLoading(bookingId);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        alert("Admin session not found.");
        return;
      }

      console.log("🟦 Sending payload:", { bookingId });

      const { data, error } = await supabase.functions.invoke(
        "generate_payment_link",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { bookingId }, // DO NOT STRINGIFY
        }
      );

      console.log("🟩 RAW RESPONSE:", data, error);

      setLinkLoading(null);

      if (error) {
        console.error("Function error:", error);
        setError("Failed to generate payment link");
        return;
      }

      if (!data) {
        setError("Empty response from server");
        return;
      }

      // 💡 Supabase sometimes returns STRING — so parse if needed
      const parsed =
        typeof data === "string" ? JSON.parse(data) : data;

      console.log("🟢 PARSED RESULT:", parsed);

      setQrData(parsed);
      setOpenQR(true);
    } catch (err) {
      console.error("generateLink Error:", err);
      setError("Unexpected error");
      setLinkLoading(null);
    }
  };

  // Mark payment success manually
  const markPaid = async (bookingId) => {
    const { error } = await supabase
      .from("bookings")
      .update({ paymentStatus: "success" })
      .eq("id", bookingId);

    if (error) {
      alert("Failed to update payment status");
    } else {
      alert("Payment marked as completed");
      fetchRequests();
    }
  };

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Pending Payment Requests
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : requests.length === 0 ? (
        <Typography>No pending UPI payments.</Typography>
      ) : (
        requests.map((r) => (
          <Paper key={r.id} sx={{ p: 2, mb: 2 }}>
            <Typography>
              <strong>Booking ID:</strong> {r.id}
            </Typography>
            <Typography>
              <strong>User ID:</strong> {r.userId}
            </Typography>
            <Typography>
              <strong>Amount:</strong> ₹{r.totalPrice}
            </Typography>

            <Box mt={2} display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={() => generateLink(r.id)}
                disabled={linkLoading === r.id}
              >
                {linkLoading === r.id ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Generate Payment Link"
                )}
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={() => markPaid(r.id)}
              >
                Mark as Paid
              </Button>
            </Box>
          </Paper>
        ))
      )}

      {/* QR Popup */}
      <Dialog open={openQR} onClose={() => setOpenQR(false)}>
        <DialogTitle>Payment QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          {qrData && (
            <>
              <img
                src={qrData.qrCode}
                width="250"
                style={{ marginBottom: 20 }}
              />

              <Typography sx={{ wordBreak: "break-all" }}>
                <strong>UPI Link:</strong> {qrData.paymentLink}
              </Typography>

              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => {
                  navigator.clipboard.writeText(qrData.paymentLink);
                  alert("Payment link copied!");
                }}
              >
                Copy UPI Link
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {error && (
        <Typography color="error" mt={2}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
