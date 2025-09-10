import React, { useEffect, useState, useMemo } from "react";
import {
  Paper, Box, Typography, MenuItem, Select, FormControl, InputLabel, TextField,
  Button, Grid, FormControlLabel, Checkbox, Divider, CircularProgress
} from "@mui/material";
import { supabase } from "../lib/supabase";

const WAY_OPTIONS = [
  {label: "1-Way Ride", value: "1-way"},
  {label: "2-Way Ride", value: "2-way"}
];

const getTotalRouteKm = (points) => {
  if (!Array.isArray(points)) return 0;
  return points.reduce((max, p) =>
    (typeof p.distanceKmFromStart === "number" && p.distanceKmFromStart > max)
    ? p.distanceKmFromStart : max, 0);
};

export default function PricingSetup() {
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [way, setWay] = useState("2-way");
  const [numDays, setNumDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rts } = await supabase.from("routes").select("id, name, points");
      const { data: vms } = await supabase.from("vehicles_model").select("*");
      setRoutes(rts || []);
      setVehicles(vms || []);
      setLoading(false);
    })();
  }, []);

  //  Pricing Calculation 
  const totalKm = useMemo(() => getTotalRouteKm(selectedRoute?.points), [selectedRoute]);
  const vehicleCategory = selectedVehicle ? selectedVehicle.vehicle_category : "";
  const acType = selectedVehicle ? selectedVehicle.ac_type : "AC";
  const hasCarrier = selectedVehicle ? Boolean(selectedVehicle.has_carrier) : false;

  const price = useMemo(() => {
    if (!totalKm || !vehicleCategory || !way) return 0;
    if (vehicleCategory.trim().toLowerCase() === "small") {
      let base = totalKm * (way === "2-way" ? 16 : 26);
      if (acType === "Non AC") base -= 1.5 * totalKm;
      base += (numDays || 1) * 500;
      if (hasCarrier) base += 200;
      return Math.round(base);
    }
    if (["medium","large","extra large"].includes(vehicleCategory.trim().toLowerCase())) {
      let base = totalKm * (way === "2-way" ? 18.5 : 30);
      if (acType === "Non AC") base -= 1.5 * totalKm;
      base += (numDays || 1) * 600;
      if (hasCarrier) base += 200;
      return Math.round(base);
    }
    return 0;
  }, [totalKm, vehicleCategory, way, numDays, acType, hasCarrier]);

  // Save in DB
  const handleSave = async () => {
    if (!selectedRouteId || !selectedVehicleId || !vehicleCategory) {
      alert("Select route and vehicle.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pricing_calculations").insert([{
      route_id: selectedRouteId,
      vehicle_model_id: selectedVehicleId,
      vehicle_category: vehicleCategory,
      ac_type: acType,
      has_carrier: hasCarrier,
      total_km: totalKm,
      way,
      num_days: numDays,
      total_price: price
    }]);
    setSaving(false);
    if (error) alert("Error saving: " + error.message);
    else alert("✅ Pricing saved!");
  };

  return (
    <Box maxWidth={650} mx="auto" my={4}>
      <Typography variant="h4" pb={2} fontWeight="bold" color="primary">
        Setup Pricing Slabs
      </Typography>
      <Paper elevation={5} sx={{ p: 4 }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Route</InputLabel>
                <Select
                  value={selectedRouteId}
                  label="Route"
                  onChange={e => setSelectedRouteId(e.target.value)}
                >
                  {routes.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.name || r.id}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Vehicle Model</InputLabel>
                <Select
                  value={selectedVehicleId}
                  label="Vehicle Model"
                  onChange={e => setSelectedVehicleId(e.target.value)}
                >
                  {vehicles.map(v => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.model_name} ({v.vehicle_category})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Vehicle Category"
                value={vehicleCategory || ""}
                fullWidth
                disabled
                InputProps={{
                  style: {
                    fontWeight: "bold",
                    color: "#1565c0",
                  }
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Total Route KM"
                value={totalKm || ""}
                fullWidth
                disabled
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Way</InputLabel>
                <Select
                  value={way}
                  label="Way"
                  onChange={e => setWay(e.target.value)}
                >
                  {WAY_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="No. of Days"
                value={numDays}
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                onChange={e => setNumDays(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>AC Type</InputLabel>
                <Select
                  value={acType}
                  label="AC Type"
                  onChange={e => { }}
                  disabled 
                >
                  <MenuItem value="AC">AC</MenuItem>
                  <MenuItem value="Non AC">Non AC</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} display="flex" alignItems="center">
              <FormControlLabel
                label="Has Carrier"
                control={<Checkbox checked={!!hasCarrier} disabled />}
                sx={{ ml: 1 }}
              />
            </Grid>
            
            <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom color="secondary" align="center">
                <span>Calculated Price: </span>
                <span style={{ fontWeight: "bold", color: "#1b5e20" }}>
                  ₹ {price}
                </span>
              </Typography>
            </Grid>

            <Grid item xs={12} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                size="large"
                color="primary"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save Pricing"}
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  );
}
