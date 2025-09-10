import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  ImageList,
  ImageListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function PartnerDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' or 'decline'

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("driver_documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert("Error fetching documents: " + error.message);
        navigate(-1);
        return;
      }
      setDocs(data);
      setLoading(false);
    };
    fetch();
  }, [id, navigate]);

  const handleDownload = (fileUrl) => {
    fetch(fileUrl, {
      method: "GET",
      headers: {},
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const filename =
          fileUrl.split("/").pop().split("?")[0] || "download";
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert("Failed to download file."));
  };

  const handleDecision = async (approve) => {
    setUpdating(true);
    const payload = approve
      ? { is_verified: true, rejection_reason: null }
      : {
          is_verified: false,
          rejection_reason: "Some documents are unclear or missing.",
        };
    const { error } = await supabase
      .from("driver_documents")
      .update(payload)
      .eq("id", id);

    setUpdating(false);
    if (error) {
      alert("Error updating status: " + error.message);
    } else {
      alert(`Partner ${approve ? "approved" : "declined"}`);
      navigate(-1);
    }
  };

  const handleOpenConfirm = (action) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    if (confirmAction === "approve") {
      handleDecision(true);
    } else if (confirmAction === "decline") {
      handleDecision(false);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
  };

  if (loading)
    return (
      <Box sx={{ py: 5, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );

  const docKeys = [
    "profile_photo",
    "license",
    "aadhar",
    "rc_book",
    "insurance",
    "vehicle_image",
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Documents for Partner
      </Typography>
      <ImageList cols={3} gap={16}>
        {docKeys.map((key) => {
          const fileUrl = docs[key];
          if (!fileUrl) return null;

          const isPdf = fileUrl.toLowerCase().endsWith(".pdf");

          return (
            <ImageListItem key={key}>
              <Typography variant="subtitle2" gutterBottom>
                {key.replace("_", " ").toUpperCase()}
              </Typography>
              {isPdf ? (
                <Box
                  sx={{
                    height: 150,
                    bgcolor: "#fafafa",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 1,
                    cursor: "pointer",
                    border: "1px solid #ddd",
                  }}
                  onClick={() => window.open(fileUrl, "_blank")}
                >
                  <Typography variant="body2" color="text.secondary">
                    📄 Click to open PDF
                  </Typography>
                </Box>
              ) : (
                <img
                  src={fileUrl}
                  alt={key}
                  loading="lazy"
                  style={{
                    width: "100%",
                    maxHeight: 150,
                    objectFit: "contain",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  onClick={() => window.open(fileUrl, "_blank")}
                />
              )}
              <Button
                variant="outlined"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => handleDownload(fileUrl)}
              >
                Download
              </Button>
            </ImageListItem>
          );
        })}
      </ImageList>

      {!docs.is_verified && !docs.rejection_reason && (
        <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            disabled={updating}
            onClick={() => handleOpenConfirm("approve")}
          >
            Approve
          </Button>
          <Button
            variant="contained"
            color="error"
            fullWidth
            disabled={updating}
            onClick={() => handleOpenConfirm("decline")}
          >
            Decline
          </Button>
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={handleCancel}>
        <DialogTitle>Confirm</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {confirmAction} this application?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>No</Button>
          <Button onClick={handleConfirm} autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
