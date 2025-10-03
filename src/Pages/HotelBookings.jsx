import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import { supabase } from "../lib/supabase";

export default function HotelBookings() {
  const [bookings, setBookings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);

    // fetch bookings with hotel details including check-out time
    const { data: bookingsData, error: bookingError } = await supabase
      .from("hotel_bookings")
      .select(
        `
        id,
        checkin_date,
        checkout_date,
        rooms,
        adults,
        children,
        total_price,
        booking_status,
        user_id,
        hotels_model:hotel_id (
          hotel_name,
          check_out_time
        )
      `
      )
      .order("created_at", { ascending: false });

    if (bookingError) {
      console.error("Error fetching bookings:", bookingError);
      setLoading(false);
      return;
    }

    // fetch profiles
    const { data: profilesData, error: profileError } = await supabase
      .from("profiles")
      .select("id, userName");

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      setLoading(false);
      return;
    }

    setProfiles(profilesData);

    // merge profiles and also auto-update completed bookings
    const merged = await Promise.all(
      bookingsData.map(async (b) => {
        const user = profilesData.find((p) => p.id === b.user_id);

        // auto mark as completed if checkout exceeded
        if (b.booking_status === "booked" || b.booking_status === "confirmed") {
          const checkoutDateTime = new Date(
            `${b.checkout_date}T${b.hotels_model?.check_out_time || "12:00:00"}`
          );
          if (new Date() > checkoutDateTime) {
            await supabase
              .from("hotel_bookings")
              .update({ booking_status: "completed" })
              .eq("id", b.id);

            b.booking_status = "completed"; // update locally
          }
        }

        return {
          ...b,
          userName: user ? user.userName : "Unknown",
        };
      })
    );

    setBookings(merged);
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from("hotel_bookings")
      .update({ booking_status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating booking status:", error);
      return;
    }

    // update local state
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, booking_status: newStatus } : b))
    );
  };

  return (
    <Box>
      <Typography variant="h4" mb={3} color="primary">
        Hotel Bookings
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, boxShadow: 3 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <b>User</b>
                </TableCell>
                <TableCell>
                  <b>Hotel</b>
                </TableCell>
                <TableCell>
                  <b>Rooms</b>
                </TableCell>
                <TableCell>
                  <b>Guests</b>
                </TableCell>
                <TableCell>
                  <b>Total Price</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.userName}</TableCell>
                    <TableCell>{b.hotels_model?.hotel_name || "-"}</TableCell>
                    <TableCell>
                      {Array.isArray(b.rooms)
                        ? b.rooms.map((r, i) => (
                            <Chip
                              key={i}
                              label={`${r.type || "Room"} x${r.count || 1}`}
                              size="small"
                              sx={{ mr: 0.5 }}
                            />
                          ))
                        : JSON.stringify(b.rooms)}
                    </TableCell>
                    <TableCell>
                      {b.adults} Adults, {b.children} Children
                    </TableCell>
                    <TableCell>₹{b.total_price}</TableCell>
                    <TableCell>
                      {b.booking_status === "cancelled" ||
                      b.booking_status === "completed" ? (
                        <Chip
                          label={b.booking_status}
                          color={
                            b.booking_status === "completed"
                              ? "success"
                              : b.booking_status === "cancelled"
                              ? "error"
                              : "warning"
                          }
                        />
                      ) : (
                        <Select
                          value={b.booking_status}
                          size="small"
                          onChange={(e) =>
                            handleStatusChange(b.id, e.target.value)
                          }
                        >
                          <MenuItem value="booked">Booked</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      )}
                    </TableCell>
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
