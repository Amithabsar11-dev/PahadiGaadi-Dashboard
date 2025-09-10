import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { supabase } from "../lib/supabase"; // adjust path
import HotelIcon from "@mui/icons-material/Hotel";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import MapIcon from "@mui/icons-material/Map";
import LuggageIcon from "@mui/icons-material/Luggage";
import RouteIcon from "@mui/icons-material/AltRoute";
import TourIcon from "@mui/icons-material/Tour";

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const drawerWidth = 300;

const statsConfig = [
  {
    title: "Hotel Listings",
    field: "hotels",
    color: "#1976d2",
    icon: <HotelIcon fontSize="large" />,
  },
  {
    title: "Sightseeing Listings",
    field: "sightseeing",
    color: "#9c27b0",
    icon: <TourIcon fontSize="large" />,
  },
  {
    title: "Order Listings",
    field: "orders",
    color: "#f44336",
    icon: <LuggageIcon fontSize="large" />,
  },
  {
    title: "Package Listings",
    field: "packages",
    color: "#ff9800",
    icon: <MapIcon fontSize="large" />,
  },
  {
    title: "Route Listings",
    field: "routes",
    color: "#4caf50",
    icon: <RouteIcon fontSize="large" />,
  },
  {
    title: "Vehicle Listings",
    field: "vehicles",
    color: "#3f51b5",
    icon: <DirectionsCarIcon fontSize="large" />,
  },
];

// Colors for pie chart
const STATUS_COLORS = {
  pending: "#ff9800",
  completed: "#4caf50",
  upcoming: "#2196f3",
  cancelled: "#f44336",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    hotels: 0,
    sightseeing: 0,
    orders: 0,
    packages: 0,
    routes: 0,
    vehicles: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [
          { count: hotels },
          { count: sightseeing },
          { count: orders },
          { count: packages },
          { count: routes },
          { count: vehicles },
        ] = await Promise.all([
          supabase
            .from("hotels_model")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("sightseeing_points")
            .select("*", { count: "exact", head: true }),
          supabase.from("bookings").select("*", { count: "exact", head: true }),
          supabase.from("packages").select("*", { count: "exact", head: true }),
          supabase.from("routes").select("*", { count: "exact", head: true }),
          supabase
            .from("vehicles_model")
            .select("*", { count: "exact", head: true }),
        ]);

        setStats({
          hotels: hotels ?? 0,
          sightseeing: sightseeing ?? 0,
          orders: orders ?? 0,
          packages: packages ?? 0,
          routes: routes ?? 0,
          vehicles: vehicles ?? 0,
        });
      } catch (error) {
        console.error("Error fetching counts:", error.message);
      }
    }

    async function fetchBookingData() {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("id, bookingStatus, created_at");
        if (error) throw error;

        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        const monthly = months.map((m) => ({
          month: m,
          pending: 0,
          completed: 0,
          upcoming: 0,
          cancelled: 0,
        }));

        const statusCount = {
          pending: 0,
          completed: 0,
          upcoming: 0,
          cancelled: 0,
        };

        data.forEach((b) => {
          const month = new Date(b.created_at).toLocaleString("default", {
            month: "short",
          });
          const status = b.bookingStatus?.toLowerCase();
          const index = months.indexOf(month);

          // Update monthly counts
          if (index !== -1 && monthly[index][status] !== undefined) {
            monthly[index][status] += 1;
          }

          // ✅ Update overall status count
          if (status && statusCount[status] !== undefined) {
            statusCount[status] += 1;
          }
        });

        setMonthlyData(monthly);
        setStatusData(
          Object.entries(statusCount).map(([name, value]) => ({
            name,
            value,
          }))
        );
      } catch (error) {
        console.error("Error fetching booking data:", error.message);
      }
    }

    fetchCounts();
    fetchBookingData();
  }, []);


  return (
    <Box sx={{ display: "flex" }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          marginTop: "0px",
          width: `calc(100% - ${drawerWidth}px)`,
        }}
      >
        <Typography variant="h4" gutterBottom color="primary">
          Welcome to Pahadi Gaadi Dashboard
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={3}>
          {statsConfig.map(({ title, field, color, icon }) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <Card
                sx={{
                  backgroundColor: color,
                  color: "white",
                  borderRadius: 2,
                  boxShadow: 4,
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="h5">{stats[field]}</Typography>
                    <Typography variant="subtitle1">{title}</Typography>
                  </Box>
                  {icon}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Graphs Section */}
        <Grid container spacing={3} sx={{ mt: 4 }}>
          {/* Bar Chart Left */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Monthly Booking Status
            </Typography>
            <BarChart
              width={500}
              height={300}
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cancelled" stackId="a" fill="#f44336" />
              <Bar dataKey="completed" stackId="a" fill="#4caf50" />
              <Bar dataKey="upcoming" stackId="a" fill="#2196f3" />
              <Bar dataKey="pending" stackId="a" fill="#ff9800" />
            </BarChart>
          </Grid>

          {/* Pie Chart Right */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Booking Status Distribution
            </Typography>
            <PieChart width={400} height={300}>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {statusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.name]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
