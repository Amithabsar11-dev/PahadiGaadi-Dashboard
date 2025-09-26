import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Collapse,
  Box,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { Edit, Visibility, Close } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function PackageListFullDetails() {
  const [packages, setPackages] = useState([]);
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();

  const fetchPackages = async () => {
    const { data, error } = await supabase.from("packages").select(`
  id, name, category, type, active, created_at, cover_image_url,
  route:routes(id, name, points),
  package_vehicles (
    vehicle:vehicle_id(id, model_name, ac_type, vehicle_category)
  ),
  package_days (
    id, day_number, vehicle_distance_km, vehicle_price, sightseeing_price, hotel_price, description,
    package_day_points (
      id,
      point_id,
      mode,
      sightseeing:package_day_point_sightseeing(
        id,
        sightseeing_id (
          id, place_name, fees_adult, fees_child
        )
      ),
      hotel:package_day_point_hotels(
        id,
        hotel_id (
          id, hotel_name, manual_price
        )
      )
    ),
    package_add_ons (
      add_on:add_on_id(id, title, price)
    )
  ),
  package_add_ons (
    add_on:add_on_id(id, title, price)
  )
`);

    if (!error) setPackages(data || []);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleToggleActive = async (id, active) => {
    await supabase.from("packages").update({ active }).eq("id", id);
    fetchPackages();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this package and all its data?")) {
      await supabase.from("packages").delete().eq("id", id);
      fetchPackages();
    }
  };
  function handleEdit(pkg) {
    navigate("/package", { state: { packageData: pkg } });
  }

  return (
    <>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h5">All Packages</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/package")}
        >
          Add Package
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Package Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Route</TableCell>
              {/* <TableCell>Vehicle</TableCell> */}
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.map((pkg) => (
              <React.Fragment key={pkg.id}>
                <TableRow>
                  <TableCell>{pkg.name}</TableCell>
                  <TableCell>{pkg.category}</TableCell>
                  <TableCell>{pkg.type}</TableCell>
                  <TableCell>{pkg.route?.name}</TableCell>
                  {/* <TableCell>{pkg.vehicle?.model_name}</TableCell> */}
                  <TableCell>
                    <Switch
                      checked={pkg.active}
                      onChange={(_, checked) =>
                        handleToggleActive(pkg.id, checked)
                      }
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ bgcolor: "#fafafa" }}>
                    <Button
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [pkg.id]: !e[pkg.id] }))
                      }
                      size="small"
                      variant="outlined"
                    >
                      {expanded[pkg.id]
                        ? "Hide Day Details"
                        : "Show Day Details"}
                    </Button>
                    <Collapse in={expanded[pkg.id]}>
                      {expanded[pkg.id] && (
                        <Box sx={{ mt: 2, mb: 2 }}>
                          {pkg.package_days && pkg.package_days.length > 0 ? (
                            <Table size="small" sx={{ bgcolor: "#f4f8fb" }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Day</TableCell>
                                  <TableCell>Distance (km)</TableCell>
                                  <TableCell>Vehicle Cost (₹)</TableCell>
                                  <TableCell>Sightseeing Cost (₹)</TableCell>
                                  <TableCell>Hotel Cost (₹)</TableCell>
                                  <TableCell>Selected Points & Modes</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {pkg.package_days.map((day) => (
                                  <TableRow key={day.id}>
                                    <TableCell>
                                      <b>{day.day_number}</b>
                                    </TableCell>
                                    <TableCell>
                                      {day.vehicle_distance_km?.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      {day.vehicle_price?.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      {day.sightseeing_price?.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      {day.hotel_price?.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      {day.package_day_points?.length > 0 ? (
                                        day.package_day_points.map((pt) => {
                                          const pointName =
                                            pkg.route?.points?.find(
                                              (rp) => rp.id === pt.point_id
                                            )?.name ?? pt.point_id;

                                          // Conditionally render segments
                                          const hasMode =
                                            pt.mode && pt.mode !== "";
                                          const hasSightseeing =
                                            pt.sightseeing?.place_name &&
                                            pt.sightseeing.place_name !== "";
                                          const hasHotel =
                                            pt.hotel?.hotel_name &&
                                            pt.hotel.hotel_name !== "";

                                          return (
                                            <div
                                              key={pt.id}
                                              style={{ marginBottom: 4 }}
                                            >
                                              <strong>Point:</strong>{" "}
                                              {pointName}
                                              {hasMode && (
                                                <>
                                                  , <strong>Mode:</strong>{" "}
                                                  {pt.mode}
                                                </>
                                              )}
                                              {hasSightseeing && (
                                                <>
                                                  ,{" "}
                                                  <strong>Sightseeing:</strong>{" "}
                                                  {pt.sightseeing.place_name}
                                                </>
                                              )}
                                              {hasHotel && (
                                                <>
                                                  , <strong>Hotel:</strong>{" "}
                                                  {pt.hotel.hotel_name}
                                                </>
                                              )}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <span>-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div>No days found for this package.</div>
                          )}
                        </Box>
                      )}
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>No packages found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
