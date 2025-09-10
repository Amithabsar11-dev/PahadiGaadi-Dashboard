import React, { useEffect, useState } from "react";
import {
  Paper,
  Box,
  Tabs,
  Tab,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function PartnerVerificationList() {
  const [status, setStatus] = useState("pending");
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const fetchPartners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_documents")
      .select("id, is_verified, rejection_reason, driver_profiles(name, phone)")
      .neq("profile_photo", null);

    if (error) {
      console.error("Error fetching documents:", error.message);
      setLoading(false);
      return;
    }

    const filtered = data.filter((doc) => {
      if (status === "pending") return doc.is_verified === false && !doc.rejection_reason;
      if (status === "approved") return doc.is_verified === true;
      if (status === "declined") return !!doc.rejection_reason;
      return false;
    });

    setPartners(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchPartners();
  }, [status]);

  const tabs = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Declined", value: "declined" },
  ];

  const statusChip = (partner) => {
    if (partner.is_verified) return <Chip label="Approved" color="success" />;
    if (partner.rejection_reason) return <Chip label="Declined" color="error" />;
    return <Chip label="Pending" color="warning" />;
  };

  const handleEdit = (pkg) => {
    navigate("/partner-documents/" + pkg.id);
  };

  return (
    <Paper
      sx={{
        p: 4,
        boxShadow: 3,
        borderRadius: 3,
      }}
    >
      <Box sx={{ borderBottom: 2, borderColor: "primary.main", mb: 3 }}>
        <Tabs
          value={status}
          onChange={(_, v) => setStatus(v)}
          aria-label="Partner verification status tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
              sx={{ fontSize: "1rem" }}
            />
          ))}
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Partner verification list">
            <TableHead>
              <TableRow>
                <TableCell>Partner Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {partners.length > 0 ? (
                partners.map((partner) => (
                  <TableRow
                    key={partner.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => handleEdit(partner)}
                  >
                    <TableCell>
                      {partner.driver_profiles?.name || "Unnamed Partner"}
                    </TableCell>
                    <TableCell>{partner.driver_profiles?.phone || "-"}</TableCell>
                    <TableCell>{statusChip(partner)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No partners found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
