import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { supabase } from "../../lib/supabase";

export default function AddTrip() {
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [filteredVehicleModels, setFilteredVehicleModels] = useState([]);

  // Form state
  const [driverId, setDriverId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleModelId, setVehicleModelId] = useState("");
  const [numSourceSeats, setNumSourceSeats] = useState("");
  const [startTime, setStartTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [tripType, setTripType] = useState("");
  const [farePerSeat, setFarePerSeat] = useState("");
  const [loading, setLoading] = useState(false);

  const [maxSeats, setMaxSeats] = useState(null);

  useEffect(() => {
    fetchDrivers();
    fetchRoutes();
    fetchVehicles();
    fetchVehicleModels();
  }, []);

  useEffect(() => {
    if (vehicleId) {
      const filteredModels = vehicleModels.filter(
        (vm) => vm.vehicle_id === vehicleId
      );
      setFilteredVehicleModels(filteredModels);

      setVehicleModelId("");
      setNumSourceSeats("");
      
      const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
      if (selectedVehicle) {
        switch (selectedVehicle.vehicleType.toLowerCase()) {
          case "private taxi":
            setTripType("Private Taxi");
            break;
          case "private bus":
            setTripType("Private Bus");
            break;
          case "shared taxi":
            setTripType("Shared Taxi");
            break;
          case "shared bus":
            setTripType("Shared Bus");
            break;
          default:
            setTripType("scheduled"); 
            break;
        }
      } else {
        setTripType("scheduled");
      }
    } else {
      setFilteredVehicleModels([]);
      setVehicleModelId("");
      setNumSourceSeats("");
      setTripType("");
    }
  }, [vehicleId, vehicleModels, vehicles]);

  useEffect(() => {
    if (vehicleModelId) {
      const selectedModel = filteredVehicleModels.find(
        (vm) => vm.id === vehicleModelId
      );
      if (selectedModel) {
        const parentVehicleId = selectedModel.vehicle_id;
        const parentVehicle = vehicles.find((v) => v.id === parentVehicleId);
        if (parentVehicle && parentVehicle.seatingCapacity) {
          setMaxSeats(parentVehicle.seatingCapacity);
          if (numSourceSeats > parentVehicle.seatingCapacity) {
            setNumSourceSeats(parentVehicle.seatingCapacity.toString());
          }
        } else {
          setMaxSeats(null);
        }
      } else {
        setMaxSeats(null);
      }
    } else {
      setMaxSeats(null);
    }
  }, [vehicleModelId, filteredVehicleModels, vehicles, numSourceSeats]);

  async function fetchDrivers() {
    const { data, error } = await supabase
      .from("driver_profiles")
      .select("id, name")
      .order("name");
    if (error) {
      console.error("Error fetching drivers", error);
      setDrivers([]);
    } else {
      setDrivers(data);
    }
  }

  async function fetchRoutes() {
    const { data, error } = await supabase
      .from("routes")
      .select("id, name")
      .eq("isActive", true)
      .order("name");
    if (error) {
      console.error("Error fetching routes", error);
      setRoutes([]);
    } else {
      setRoutes(data);
    }
  }

  async function fetchVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, vehicleType, seatingCapacity")
      .order("vehicleType");
    if (error) {
      console.error("Error fetching vehicles", error);
      setVehicles([]);
    } else {
      setVehicles(data);
    }
  }

  async function fetchVehicleModels() {
    const { data, error } = await supabase
      .from("vehicles_model")
      .select("id, model_name, vehicle_id")
      .order("model_name");
    if (error) {
      console.error("Error fetching vehicle models", error);
      setVehicleModels([]);
    } else {
      setVehicleModels(data);
    }
  }

  async function handleAddTrip() {
    if (
      !driverId ||
      !routeId ||
      !vehicleId ||
      !vehicleModelId ||
      !numSourceSeats ||
      !startTime
    ) {
      alert("Please fill all required fields.");
      return;
    }
    
    if (maxSeats && Number(numSourceSeats) > maxSeats) {
      alert(
        `Number of seats cannot exceed vehicle model's seating capacity (${maxSeats}).`
      );
      return;
    }

    setLoading(true);

    const departureISO = new Date(startTime).toISOString();

    const { data, error } = await supabase.from("trips").insert([
      {
        userId: driverId,
        routeId,
        vehicleId,
        vehicleModelId,
        seat: numSourceSeats,
        departureTime: departureISO,
        tripType,
        farePerSeat: farePerSeat ? Number(farePerSeat) : null,
        status: "upcoming",      
        ride_status: "scheduled",  
        current_point_index: 0,    
      },
    ]);

    if (error) {
      alert("Error adding trip: " + error.message);
    } else {
      alert("Trip added successfully");
      setDriverId("");
      setRouteId("");
      setVehicleId("");
      setVehicleModelId("");
      setNumSourceSeats("");
      setStartTime("");
      setFarePerSeat("");
      setTripType("");
    }

    setLoading(false);
  }

  const handleSeatsChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      setNumSourceSeats("");
      return;
    }
    const numericVal = Number(val);
    if (!isNaN(numericVal)) {
      if (maxSeats && numericVal > maxSeats) {
        setNumSourceSeats(maxSeats.toString());
      } else if(numericVal < 0) {
        setNumSourceSeats("0");
      } else {
        setNumSourceSeats(val);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography variant="h6" gutterBottom>
        Add Trip
      </Typography>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="driver-select-label">Driver</InputLabel>
        <Select
          labelId="driver-select-label"
          value={driverId}
          label="Driver"
          onChange={(e) => setDriverId(e.target.value)}
        >
          <MenuItem value="">
            <em>Select Driver</em>
          </MenuItem>
          {drivers.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="route-select-label">Route</InputLabel>
        <Select
          labelId="route-select-label"
          value={routeId}
          label="Route"
          onChange={(e) => setRouteId(e.target.value)}
        >
          <MenuItem value="">
            <em>Select Route</em>
          </MenuItem>
          {routes.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="vehicle-select-label">Vehicle</InputLabel>
        <Select
          labelId="vehicle-select-label"
          value={vehicleId}
          label="Vehicle"
          onChange={(e) => setVehicleId(e.target.value)}
        >
          <MenuItem value="">
            <em>Select Vehicle</em>
          </MenuItem>
          {vehicles.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.vehicleType}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="vehicle-model-select-label">Vehicle Model</InputLabel>
        <Select
          labelId="vehicle-model-select-label"
          value={vehicleModelId}
          label="Vehicle Model"
          onChange={(e) => setVehicleModelId(e.target.value)}
          disabled={!vehicleId}
        >
          <MenuItem value="">
            <em>Select Vehicle Model</em>
          </MenuItem>
          {filteredVehicleModels.map((vm) => (
            <MenuItem key={vm.id} value={vm.id}>
              {vm.model_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Number of Source Seats"
        value={numSourceSeats}
        type="number"
        fullWidth
        sx={{ mt: 2 }}
        onChange={handleSeatsChange}
        inputProps={{ min: 0, max: maxSeats || undefined }}
        helperText={
          maxSeats
            ? `Max seats allowed: ${maxSeats}`
            : "Select a vehicle model to see seat limit"
        }
      />

      <TextField
        label="Start Time"
        type="datetime-local"
        fullWidth
        sx={{ mt: 2 }}
        InputLabelProps={{ shrink: true }}
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />

      <TextField
        label="Arrival Time"
        type="datetime-local"
        fullWidth
        sx={{ mt: 2 }}
        InputLabelProps={{ shrink: true }}
        value={arrivalTime}
        onChange={(e) => setArrivalTime(e.target.value)}
      />

      <TextField
        label="Trip Type"
        value={tripType}
        fullWidth
         sx={{ mt: 2, mb: 4 }}
        InputProps={{
          readOnly: true,
        }}
      />

      {/* <TextField
        label="Fare Per Seat"
        value={farePerSeat}
        type="number"
        fullWidth
        sx={{ mt: 2, mb: 4 }}
        onChange={(e) => setFarePerSeat(e.target.value)}
        inputProps={{ min: 0, step: "0.01" }}
      /> */}

      <Button
        variant="contained"
        onClick={handleAddTrip}
        disabled={loading}
      >
        {loading ? "Adding…" : "Add Trip"}
      </Button>
    </Box>
  );
}
