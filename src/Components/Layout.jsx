import React, { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Toolbar,
  AppBar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Button,
} from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminStore } from "../store/AdminStore";
import { supabase } from "../lib/supabase";

const drawerWidth = 300;
const dashboardItems = [
  { title: "Routes", screen: "/Allroutes" },
  { title: "Vehicles", screen: "/vehiclelist" },
  { title: "ZonesClusters", screen: "/ZonesClusters" },
  { title: "Vehicle Pricing", screen: "/VehiclePricingConfig" },
  { title: "Hotels", screen: "/hotels" },
  { title: "Sightseeing", screen: "/sightseeing" },
  { title: "Addons", screen: "/Addons" },
  { title: "Packages", screen: "/packages" },
  { title: "Orders", screen: "/orders" },
  { title: "Hotel Bookings", screen: "/hotelbookings" },
  { title: "Trips", screen: "/trips" },
  { title: "BookingRequests", screen: "/BookingRequests" },
  // { title: "Pricing", screen: "/pricing" },
  { title: "Partner Verification", screen: "/partner-verification" },
  { title: "Driver Profiles", screen: "/drivers" },
  { title: "Customer Profiles", screen: "/customers" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get logged in admin info from your global store
  const adminName = useAdminStore((state) => state.adminName);
  const adminRole = useAdminStore((state) => state.adminRole);
  const setAdminId = useAdminStore((state) => state.setAdminId);
  const setAdminName = useAdminStore((state) => state.setAdminName);
  const setAdminRole = useAdminStore((state) => state.setAdminRole);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await supabase.auth.signOut();
    // Clear your store info
    setAdminId(null);
    setAdminName(null);
    setAdminRole(null);
    navigate("/signin", { replace: true });
  };

  const drawerContent = (
    <Box sx={{ width: drawerWidth, height: "100%", overflow: "hidden" }}>
      <Toolbar>
        <Typography variant="h6" color="primary">
          Dashboard
        </Typography>
      </Toolbar>
      <List sx={{ overflowY: "auto", maxHeight: `calc(100vh - 64px)` }}>
        {dashboardItems.map(({ title, screen }) => (
          <ListItem key={title} disablePadding>
            <ListItemButton
              selected={location.pathname === screen}
              onClick={() => navigate(screen)}
            >
              <ListItemText primary={title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" color="inherit" noWrap>
            Dashboard
          </Typography>

          {/* Sign-off button with dropdown */}
          <Box>
            <Button
              color="inherit"
              onClick={handleMenuOpen}
              startIcon={
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}
                >
                  {adminName ? adminName.charAt(0).toUpperCase() : "U"}
                </Avatar>
              }
              sx={{ textTransform: "none" }}
            >
              {adminName || "User"}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem disabled>
                <Typography variant="subtitle1">
                  {adminName || "Unnamed"}
                </Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Role: {adminRole || "No role"}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            overflowX: "hidden",
            overflowY: "auto",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          marginTop: "64px",
          width: `calc(100% - ${drawerWidth}px)`,
        }}
      >
        {/* Nested routes will render here */}
        <Outlet />
      </Box>
    </Box>
  );
}
