import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableHead,
  Box,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Select,
  InputLabel,
  FormControl,
  Switch,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "../lib/supabase";

const VEHICLE_CATEGORIES = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "extra_large", label: "Extra Large" },
];

const AC_TYPES = [
  { value: "ac", label: "AC" },
  { value: "non_ac", label: "Non AC" },
];

const RIDE_TYPES = [
  { value: "one-way", label: "One Way" },
  { value: "two-way", label: "Two Way" },
];

function groupByCategory(data) {
  const grouped = {};
  data.forEach((item) => {
    if (!grouped[item.vehicle_category]) grouped[item.vehicle_category] = [];
    grouped[item.vehicle_category].push(item);
  });
  return grouped;
}

export default function VehiclePricingTable() {
  const [pricingRows, setPricingRows] = useState([]);
  const [zonesClusters, setZonesClusters] = useState([]);
  const [zones, setZones] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [selectedVehicleCategories, setSelectedVehicleCategories] = useState([]);
  const [acType, setAcType] = useState("");
  const [rideType, setRideType] = useState("one-way");
  const [pricePerKm, setPricePerKm] = useState("");
  const [carrierCharge, setCarrierCharge] = useState("");
  const [nightCharge, setNightCharge] = useState("");
  const [selectedZones, setSelectedZones] = useState([]);
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [useSlab, setUseSlab] = useState(false);
  const [slabDistance, setSlabDistance] = useState("");
  const [applySlabToAll, setApplySlabToAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      const { data: pricingData } = await supabase
        .from("vehicle_pricing_config")
        .select("*");
      setPricingRows(pricingData || []);
      const { data: zcData } = await supabase
        .from("zones_clusters")
        .select("zone_name, cluster_name");
      setZonesClusters(zcData || []);
      setZones([...new Set((zcData || []).map((z) => z.zone_name))]);
    })();
  }, []);

  // Update clusters on selectedZones change
  useEffect(() => {
    if (selectedZones.length === 0) {
      setClusters([]);
      setSelectedClusters([]);
      setAllSelected(false);
      return;
    }
    const clusterSet = new Set();
    zonesClusters.forEach(({ zone_name, cluster_name }) => {
      if (selectedZones.includes(zone_name)) {
        clusterSet.add(cluster_name);
      }
    });
    const combinedClusters = Array.from(clusterSet);
    setClusters(combinedClusters);

    const filteredSelectedClusters = selectedClusters.filter((c) =>
      combinedClusters.includes(c)
    );
    setSelectedClusters(filteredSelectedClusters);

    setAllSelected(
      filteredSelectedClusters.length === combinedClusters.length && combinedClusters.length > 0
    );
  }, [selectedZones, zonesClusters]);

  const toggleZone = (zone) => {
    if (selectedZones.includes(zone)) {
      setSelectedZones(selectedZones.filter((z) => z !== zone));
    } else {
      setSelectedZones([...selectedZones, zone]);
    }
  };

  const handleClusterChange = (cluster) => {
    if (selectedClusters.includes(cluster)) {
      setSelectedClusters(selectedClusters.filter((c) => c !== cluster));
      setAllSelected(false);
    } else {
      const newSelected = [...selectedClusters, cluster];
      setSelectedClusters(newSelected);
      if (newSelected.length === clusters.length) setAllSelected(true);
    }
  };

  const handleSelectAllClusters = (e) => {
    if (e.target.checked) {
      setSelectedClusters(clusters);
      setAllSelected(true);
    } else {
      setSelectedClusters([]);
      setAllSelected(false);
    }
  };

  function resetForm() {
    setSelectedVehicleCategories([]);
    setAcType("");
    setRideType("one-way");
    setPricePerKm("");
    setCarrierCharge("");
    setNightCharge("");
    setSelectedZones([]);
    setClusters([]);
    setSelectedClusters([]);
    setAllSelected(false);
    setUseSlab(false);
    setSlabDistance("");
    setApplySlabToAll(false);
    setErrorMsg("");
    setSuccessMsg("");
    setEditId(null);
  }

  function openAddDialog() {
    resetForm();
    setDialogOpen(true);
  }

  async function openEditDialog(row) {
    setEditId(row.id);
    setSelectedVehicleCategories([row.vehicle_category]);
    setAcType(row.ac_type);
    setRideType(row.ride_type || "one-way");
    setPricePerKm(row.vehicle_price_per_km ?? "");
    setCarrierCharge(row.carrier_charge ?? "");
    setNightCharge(row.fixed_night_charge ?? "");

    // Read JSON array directly
    setSelectedZones(Array.isArray(row.zone_name) ? row.zone_name : []);
    setClusters(Array.isArray(row.clusters) ? row.clusters : []);
    setSelectedClusters(Array.isArray(row.clusters) ? row.clusters : []);
    setAllSelected(
      Array.isArray(row.clusters) && row.clusters.length === (row.clusters?.length || 0)
    );

    setUseSlab(row.use_slab ?? false);
    setSlabDistance(row.slab_distance ? String(row.slab_distance) : "");
    setApplySlabToAll(false);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    resetForm();
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this pricing record?")) return;
    const { error } = await supabase.from("vehicle_pricing_config").delete().eq("id", id);
    if (error) {
      setErrorMsg("Delete failed: " + error.message);
      return;
    }
    setSuccessMsg("Pricing record deleted.");
    const { data: pricingData } = await supabase.from("vehicle_pricing_config").select("*");
    setPricingRows(pricingData || []);
  }

  async function handleSavePricing() {
    setErrorMsg("");

    if (
      selectedVehicleCategories.length === 0 ||
      !acType ||
      pricePerKm === "" ||
      carrierCharge === "" ||
      nightCharge === ""
    ) {
      setErrorMsg(
        "Please fill the required fields: Vehicle Category, AC Type, Price, Carrier, Night charge."
      );
      return;
    }

    if (useSlab && (slabDistance === "" || slabDistance === null)) {
      setErrorMsg("Please enter slab distance if slab pricing is enabled.");
      return;
    }

    if (applySlabToAll && useSlab) {
      const { error: bulkError } = await supabase
        .from("vehicle_pricing_config")
        .update({
          zone_name: selectedZones.length ? selectedZones : [],
          clusters: selectedClusters.length ? selectedClusters : [],
          use_slab: true,
          slab_distance: Number(slabDistance),
        })
        .not("id", "is", null);

      if (bulkError) {
        setErrorMsg("Bulk slab update failed: " + bulkError.message);
        return;
      }
    }

    const newEntry = {
      vehicle_category: selectedVehicleCategories[0],
      ac_type: acType,
      ride_type: rideType,
      vehicle_price_per_km: Number(pricePerKm),
      carrier_charge: Number(carrierCharge),
      fixed_night_charge: Number(nightCharge),
      zone_name: selectedZones, // store as JSON array
      clusters: selectedClusters, // store as JSON array
      use_slab: useSlab,
      slab_distance: useSlab ? Number(slabDistance) : null,
    };

    if (editId) {
      const { error } = await supabase
        .from("vehicle_pricing_config")
        .update(newEntry)
        .eq("id", editId);
      if (error) {
        setErrorMsg("Update failed: " + error.message);
        return;
      }
    } else {
      const inserts = selectedVehicleCategories.map((cat) => ({
        ...newEntry,
        vehicle_category: cat,
      }));
      const { error } = await supabase.from("vehicle_pricing_config").insert(inserts);
      if (error) {
        setErrorMsg("Insert failed: " + error.message);
        return;
      }
    }

    setSuccessMsg(editId ? "Pricing updated" : "Pricing saved");
    setDialogOpen(false);

    const { data: pricingData } = await supabase.from("vehicle_pricing_config").select("*");
    setPricingRows(pricingData || []);
    resetForm();
  }

  const showZoneColumn = pricingRows.some((r) => r.zone_name?.length > 0);
  const showClustersColumn = pricingRows.some((r) => r.clusters?.length > 0);
  const showSlabColumn = pricingRows.some((r) => r.use_slab);

  const grouped = groupByCategory(pricingRows);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", mx: 8 }}>
        <Typography variant="h5" gutterBottom>
          Vehicle Pricing Management
        </Typography>
        <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={openAddDialog}>
          Add Pricing
        </Button>
      </Box>

      <Paper sx={{ maxWidth: 1100, margin: "auto", p: 4 }}>
        {!dialogOpen && (
          <>
            {Object.keys(grouped).length === 0 && <Typography>No pricing found.</Typography>}
            {Object.entries(grouped).map(([category, rows]) => (
              <TableContainer key={category} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ my: 1 }}>
                  {VEHICLE_CATEGORIES.find((v) => v.value === category)?.label || category}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>AC Type</TableCell>
                      <TableCell>Per Km Price</TableCell>
                      <TableCell>Ride Type</TableCell>
                      {showZoneColumn && <TableCell>Zones</TableCell>}
                      {showClustersColumn && <TableCell>Clusters</TableCell>}
                      {showSlabColumn && <TableCell>Slab Rule</TableCell>}
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {AC_TYPES.find((a) => a.value === row.ac_type)?.label || row.ac_type}
                        </TableCell>
                        <TableCell>{row.vehicle_price_per_km}</TableCell>
                        <TableCell>{row.ride_type === "two-way" ? "Two Way" : "One Way"}</TableCell>
                        {showZoneColumn && (
                          <TableCell>
                            {Array.isArray(row.zone_name) ? row.zone_name.join(", ") : "—"}
                          </TableCell>
                        )}
                        {showClustersColumn && (
                          <TableCell>
                            {Array.isArray(row.clusters) ? row.clusters.join(", ") : "—"}
                          </TableCell>
                        )}
                        {showSlabColumn && (
                          <TableCell>
                            {row.use_slab ? `Slab: ${row.slab_distance} km` : "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <IconButton onClick={() => openEditDialog(row)} aria-label="edit" color="primary">
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(row.id)}
                            aria-label="delete"
                            color="error"
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
          </>
        )}

        <Dialog open={dialogOpen} maxWidth="sm" fullWidth>
          <DialogTitle>{editId ? "Edit Pricing" : "Add Pricing"}</DialogTitle>
          <DialogContent>
            <Typography mb={1}>Select Vehicle Category(s)</Typography>
            <FormGroup row sx={{ mb: 2 }}>
              {VEHICLE_CATEGORIES.map((cat) => (
                <FormControlLabel
                  key={cat.value}
                  control={
                    <Checkbox
                      checked={selectedVehicleCategories.includes(cat.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setSelectedVehicleCategories([...selectedVehicleCategories, cat.value]);
                        } else {
                          setSelectedVehicleCategories(
                            selectedVehicleCategories.filter((v) => v !== cat.value)
                          );
                        }
                      }}
                      disabled={!!editId}
                    />
                  }
                  label={cat.label}
                />
              ))}
              {editId && (
                <Typography variant="caption" sx={{ ml: 1 }}>
                  Multiple categories can only be selected when adding.
                </Typography>
              )}
            </FormGroup>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>AC Type</InputLabel>
              <Select
                value={acType}
                onChange={(e) => setAcType(e.target.value)}
                label="AC Type"
              >
                {AC_TYPES.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Ride Type</InputLabel>
              <Select
                value={rideType}
                onChange={(e) => setRideType(e.target.value)}
                label="Ride Type"
              >
                {RIDE_TYPES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Per Km Price"
              type="number"
              value={pricePerKm}
              onChange={(e) => setPricePerKm(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="Carrier Charge"
              type="number"
              value={carrierCharge}
              onChange={(e) => setCarrierCharge(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 1 }}
            />

            <TextField
              label="Night Charge"
              type="number"
              value={nightCharge}
              onChange={(e) => setNightCharge(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 1 }}
            />

            <Typography>Select Zones</Typography>
            <FormGroup row sx={{ mb: 2 }}>
              {zones.map((zoneName) => (
                <FormControlLabel
                  key={zoneName}
                  control={
                    <Checkbox
                      checked={selectedZones.includes(zoneName)}
                      onChange={() => toggleZone(zoneName)}
                    />
                  }
                  label={zoneName}
                />
              ))}
            </FormGroup>

            <Typography>Select Clusters</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedClusters.length > 0 && selectedClusters.length < clusters.length}
                  onChange={handleSelectAllClusters}
                />
              }
              label="All"
            />
            <FormGroup row sx={{ mb: 2 }}>
              {clusters.map((cluster) => (
                <FormControlLabel
                  key={cluster}
                  control={
                    <Checkbox
                      checked={selectedClusters.includes(cluster)}
                      onChange={() => handleClusterChange(cluster)}
                    />
                  }
                  label={cluster}
                />
              ))}
            </FormGroup>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Switch
                checked={useSlab}
                onChange={(e) => {
                  setUseSlab(e.target.checked);
                  if (!e.target.checked) setApplySlabToAll(false);
                }}
              />
              <Typography sx={{ ml: 1 }}>Enable Slab Pricing?</Typography>
            </Box>

            {useSlab && (
              <>
                <TextField
                  label="Slab Distance (km)"
                  type="number"
                  value={slabDistance}
                  onChange={(e) => setSlabDistance(e.target.value)}
                  fullWidth
                  sx={{ mt: 1, mb: 2 }}
                  inputProps={{ min: 0, step: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applySlabToAll}
                      onChange={(e) => setApplySlabToAll(e.target.checked)}
                    />
                  }
                  label="Apply slab rule to all categories"
                />
              </>
            )}

            {errorMsg && (
              <Typography color="error" sx={{ mt: 1 }}>
                {errorMsg}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSavePricing}>
              {editId ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </>
  );
}
