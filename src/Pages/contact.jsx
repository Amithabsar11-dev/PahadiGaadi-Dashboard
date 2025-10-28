// src/screens/Contact.js
import React from "react";
import { Box, Typography } from "@mui/material";
import ContactImage from "../assets/contact-image.jpg";

export default function Contact() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "80vh",
        textAlign: "center",
      }}
    >
      <Box
        component="img"
        src={ContactImage}
        alt="Contact"
        sx={{
          width: 400,
          height: 400,
          objectFit: "contain",
          mb: 3,
        }}
      />

      <Typography variant="h6" color="text.primary">
        📞 +91 7533800542 / 8650777759
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
        ✉️ saralbhraman@gmail.com
      </Typography>
    </Box>
  );
}
