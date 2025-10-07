import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  AddCircleOutline,
  Delete,
  Clear as ClearIcon,
} from "@mui/icons-material";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { supabase } from "../lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import clusters from "../utils/clusters";
import { ArrowBack } from "@mui/icons-material";
import { useAdminStore } from "../store/AdminStore";

function isPointInPolygon(point, polygon) {
  const [x, y] = [point.lng, point.lat];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getClusterZoneForPoint(lat, lng) {
  for (const c of clusters) {
    if (isPointInPolygon({ lat, lng }, c.coordinates)) {
      return { cluster: c.cluster, zone: c.zone };
    }
  }
  return { cluster: null, zone: null };
}

async function fetchZoneClusterFromLatLng(lat, lng, apiKey) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status !== "OK" || !data.results.length)
      return { cluster: null, zone: null };

    const comps = data.results[0].address_components;

    // Safely initialize all variables
    let sublocality = null;
    let locality = null;
    let district = null;
    let state = null;
    let country = null;

    for (const c of comps) {
      const types = c.types;

      if (
        !sublocality &&
        types.some((t) =>
          ["sublocality", "sublocality_level_1", "neighborhood"].includes(t)
        )
      ) {
        sublocality = c.long_name;
      }

      if (
        !locality &&
        types.some((t) =>
          ["locality", "administrative_area_level_3"].includes(t)
        )
      ) {
        locality = c.long_name;
      }

      if (!district && types.includes("administrative_area_level_2")) {
        district = c.long_name;
      }

      if (!state && types.includes("administrative_area_level_1")) {
        state = c.long_name;
      }

      if (!country && types.includes("country")) {
        country = c.long_name;
      }
    }

    console.log("📍Resolved:", {
      sublocality,
      locality,
      district,
      state,
      country,
    });

    // Determine best match for cluster and zone
    // Determine best match for cluster and zone
    let cluster =
      sublocality || locality || district || state || country || "Unknown";

    // 👇 improved zone logic
    let zone = null;
    if (sublocality && locality) zone = locality;
    else if (locality && district) zone = district;
    else if (district) zone = district;
    else if (locality) zone = locality;
    else zone = state || country || "Unknown";

    // For debugging
    console.log("📍Resolved Location:", {
      sublocality,
      locality,
      district,
      state,
      country,
      cluster,
      zone,
    });

    return { cluster, zone };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return { cluster: null, zone: null };
  }
}

function secondsToHHMM(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const hrStr = hrs > 0 ? `${hrs}h ` : "";
  const minStr = mins > 0 ? `${mins}m` : "";
  return hrStr + minStr || "0m";
}

function calculatePrivatePrice(distance, duration) {
  const dist = Number(distance) || 0;
  const dur = Number(duration) || 0;
  const pricingTiers = [
    { max: 1, calc: (km, dur) => 150 + dur * 3 },
    { max: 5, calc: (km, dur) => 15 + dur * 2 },
    { max: 15, calc: (km, dur) => 8 + dur * 0.5 },
    { max: 25, calc: (km, dur) => 7 + dur * 0.5 },
    { max: 50, calc: (km, dur) => 7 + dur * 0.5 },
    { max: 100, calc: (km, dur) => 7 + dur * 0.2 },
    { max: 250, calc: (km) => km * 7 },
    { max: Infinity, calc: (km) => km * 7 },
  ];

  let remainingKm = dist;
  let prevMax = 0;
  let totalCost = 0;

  for (const tier of pricingTiers) {
    if (remainingKm <= 0) break;
    const tierKm = Math.min(remainingKm, tier.max - prevMax);
    if (tierKm <= 0) {
      prevMax = tier.max;
      continue;
    }
    const tierDuration = (tierKm / dist) * dur;
    const cost =
      tier.calc.length === 2
        ? tier.calc(tierKm, tierDuration)
        : tier.calc(tierKm);
    totalCost += cost;
    remainingKm -= tierKm;
    prevMax = tier.max;
  }
  return totalCost.toFixed(2);
}

const GOOGLE_MAPS_API_KEY = "AIzaSyCZzvtEzsasKJAHjzM-lJi1XlTauDhgqUY";

async function fetchDrivingRoute(points, apiKey) {
  if (points.length < 2) return null;
  const origin = {
    location: {
      latLng: { latitude: points[0].lat, longitude: points[0].lng },
    },
  };
  const destination = {
    location: {
      latLng: {
        latitude: points[points.length - 1].lat,
        longitude: points[points.length - 1].lng,
      },
    },
  };
  const intermediates = points.slice(1, -1).map((pt) => ({
    location: { latLng: { latitude: pt.lat, longitude: pt.lng } },
  }));

  const response = await fetch(
    `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs",
      },
      body: JSON.stringify({
        origin,
        destination,
        intermediates,
        travelMode: "DRIVE",
      }),
    }
  );

  if (!response.ok)
    throw new Error(
      `Routes API error: ${response.status} ${response.statusText}`
    );

  const json = await response.json();
  return json.routes?.[0] || null;
}

function PlaceAutocomplete({ label, value, onSelect, errorMsg, infoMsg }) {
  const {
    ready,
    value: inputValue,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
    requestOptions: { types: ["geocode"] },
  });

  React.useEffect(() => {
    if (value && value.name !== inputValue) setValue(value.name, false);
  }, [value, inputValue, setValue]);

  const handleInput = (e) => setValue(e.target.value);
  const handleClear = () => {
    setValue("");
    clearSuggestions();
    onSelect(null, "");
  };

  const handleSelect = async (address) => {
    setValue(address, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address });
      if (!results.length) return;
      const place = results[0];
      const { lat, lng } = await getLatLng(place);

      let zoneClusterObj = getClusterZoneForPoint(lat, lng);

      if (!zoneClusterObj.cluster || !zoneClusterObj.zone) {
        // If not found in predefined clusters, fallback to Google Maps-derived zones
        zoneClusterObj = await fetchZoneClusterFromLatLng(
          lat,
          lng,
          GOOGLE_MAPS_API_KEY
        );
      }

      const zoneInfo =
        zoneClusterObj.cluster && zoneClusterObj.zone
          ? `${zoneClusterObj.cluster} (${zoneClusterObj.zone})`
          : "No Zone/Cluster";

      onSelect(
        {
          name: address,
          lat,
          lng,
          placeId: place.place_id,
          zoneInfo,
        },
        ""
      );
    } catch (error) {
      console.error("Place select error:", error);
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        label={label}
        value={inputValue}
        onChange={handleInput}
        disabled={!ready}
        fullWidth
        autoComplete="off"
        sx={{ mb: 1 }}
        error={!!errorMsg}
        helperText={errorMsg || infoMsg}
        InputProps={{
          endAdornment: value ? (
            <IconButton
              onClick={handleClear}
              size="small"
              aria-label="clear input"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          ) : null,
        }}
      />
      {status === "OK" && (
        <Paper
          sx={{
            position: "absolute",
            zIndex: 9999,
            maxHeight: 200,
            overflowY: "auto",
            width: "100%",
          }}
        >
          {data.map(({ place_id, description }) => (
            <Box
              key={place_id}
              sx={{
                p: 1,
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
              }}
              onClick={() => handleSelect(description)}
              tabIndex={0}
            >
              {description}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

export default function RoutesManager() {
  const location = useLocation();
  const navigate = useNavigate();

  const { route: editRoute, isEditing } = location.state || {};

  const vehicleOptions = [
    "Private Taxi",
    "Private Bus",
    "Shared Bus",
    "Shared Taxi",
  ];
  const adminName = useAdminStore((s) => s.adminName);
  const adminRole = useAdminStore((s) => s.adminRole);

  const [name, setName] = useState(editRoute?.name || "");
  const [description, setDescription] = useState(editRoute?.description || "");
  const [vehicleType, setVehicleType] = useState(editRoute?.vehicleType || "");
  const [isActive, setIsActive] = useState(editRoute?.isActive ?? true);
  const [source, setSource] = useState(editRoute?.points?.[0] || null);
  const [middlePoints, setMiddlePoints] = useState(
    editRoute?.points?.slice(1, -1) || []
  );
  const [destination, setDestination] = useState(
    editRoute?.points?.slice(-1)[0] || null
  );
  const [sharedRates, setSharedRates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [destinationError, setDestinationError] = useState("");
  const [midErrors, setMidErrors] = useState([]);
  const [sourceInfo, setSourceInfo] = useState(source?.zoneInfo || "");
  const [destinationInfo, setDestinationInfo] = useState(
    destination?.zoneInfo || ""
  );
  const [midInfos, setMidInfos] = useState([]);

  useEffect(() => {
    async function loadRouteData() {
      const points = [
        source,
        ...middlePoints.filter(Boolean),
        destination,
      ].filter(Boolean);
      if (!vehicleType || points.length < 2) {
        setSegments([]);
        return;
      }
      try {
        const route = await fetchDrivingRoute(points, GOOGLE_MAPS_API_KEY);
        if (!route) {
          setSegments([]);
          return;
        }
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;
        const segmentsArr = [];
        route.legs.forEach((leg, i) => {
          const distanceKm = leg.distanceMeters / 1000;
          let durationSec = 0;
          if (typeof leg.duration === "string") {
            durationSec = parseInt(leg.duration.replace("s", ""), 10);
          } else if (typeof leg.duration?.seconds === "number") {
            durationSec = leg.duration.seconds;
          }
          const durationMin = Number((durationSec / 60).toFixed(2));
          cumulativeDistance += distanceKm;
          cumulativeDuration += durationSec;
          segmentsArr.push({
            id: `${points[i].name}->${points[i + 1].name}`,
            from: points[i].name,
            to: points[i + 1].name,
            distanceKm: Number(distanceKm.toFixed(2)),
            durationSec,
            durationMin,
            durationHr: Number((durationSec / 3600).toFixed(2)),
            durationFormatted: secondsToHHMM(durationSec),
            cumulativeDist: Number(cumulativeDistance.toFixed(2)),
            cumulativeDurSec: cumulativeDuration,
            cumulativeDurFormatted: secondsToHHMM(cumulativeDuration),
          });
        });
        setSegments(segmentsArr);

        if (vehicleType.toLowerCase().includes("shared")) {
          // ✅ Use saved rates if editing
          if (isEditing && editRoute?.pricing) {
            setSharedRates(
              segmentsArr.map((seg, idx) => {
                const savedRate = editRoute.pricing.find(
                  (p) => p.from === seg.from && p.to === seg.to
                );
                return savedRate
                  ? savedRate
                  : { from: seg.from, to: seg.to, rate: "" };
              })
            );
          } else {
            setSharedRates(
              segmentsArr.map((seg) => ({
                from: seg.from,
                to: seg.to,
                rate: "",
              }))
            );
          }
        }
      } catch {
        setSegments([]);
      }
    }
    loadRouteData();
  }, [source, middlePoints, destination, vehicleType]);

  const addMidPoint = () => {
    setMiddlePoints((mp) => [...mp, null]);
    setMidErrors((err) => [...err, ""]);
    setMidInfos((inf) => [...inf, ""]);
  };

  const removeMidPoint = (idx) => {
    setMiddlePoints((mp) => mp.filter((_, i) => i !== idx));
    setMidErrors((errs) => errs.filter((_, i) => i !== idx));
    setMidInfos((infos) => infos.filter((_, i) => i !== idx));
    setSharedRates((sr) => sr.filter((_, i) => i !== idx));
  };

  const updateMidPoint = (idx, val, err, info) => {
    setMiddlePoints((mp) => {
      const arr = [...mp];
      arr[idx] = val;
      return arr;
    });
    setMidErrors((merr) => {
      const arr = [...merr];
      arr[idx] = err || "";
      return arr;
    });
    setMidInfos((infos) => {
      const arr = [...infos];
      arr[idx] = info || "";
      return arr;
    });
  };

  const buildPointsArray = () => {
    const allPoints = [source, ...middlePoints.filter(Boolean), destination];
    return allPoints.map((p, idx) => {
      const id = `p${idx + 1}`;
      let type = "mid";
      if (idx === 0) type = "start";
      else if (idx === allPoints.length - 1) type = "end";
      let cluster = null;
      let zone = null;
      if (p?.zoneInfo) {
        const matches = p.zoneInfo.match(/(.*) \((.*)\)/);
        if (matches) {
          cluster = matches[1].trim();
          zone = matches[2].trim();
        } else {
          zone = p.zoneInfo;
        }
      }
      const seg = segments[idx - 1] || {};
      const cumulativeDist = seg.cumulativeDist || 0;
      const segDurationHr = seg.durationSec
        ? `${(seg.durationSec / 3600).toFixed(1)}h`
        : "0.0h";
      let estimatedCost = 0;
      if (
        vehicleType &&
        vehicleType.toLowerCase().includes("private") &&
        typeof seg.distanceKm === "number" &&
        typeof seg.durationMin === "number"
      ) {
        estimatedCost = Number(
          calculatePrivatePrice(seg.distanceKm, seg.durationMin)
        );
      } else if (sharedRates[idx - 1] && sharedRates[idx - 1].rate) {
        estimatedCost = Number(sharedRates[idx - 1].rate);
      }
      return {
        id,
        lat: p.lat,
        lng: p.lng,
        name: p.name,
        type,
        cluster,
        zone,
        distanceKm: seg.distanceKm || 0,
        estimatedCost,
        estimatedDuration: segDurationHr,
        distanceKmFromStart: cumulativeDist,
        estimatedDurationFromStart: seg.durationFormatted || "0.0h",
      };
    });
  };

  const getTotalPricePrivate = () =>
    segments
      .map((seg) => calculatePrivatePrice(seg.distanceKm, seg.durationMin))
      .reduce((acc, val) => acc + Number(val), 0)
      .toFixed(2);

  const getTotalPriceShared = () =>
    sharedRates
      .reduce((acc, { rate }) => acc + (Number(rate) || 0), 0)
      .toFixed(2);

  const handleSharedRateChange = (idx, val) => {
    setSharedRates((sr) =>
      sr.map((r, i) => (i === idx ? { ...r, rate: val } : r))
    );
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!name.trim()) {
      alert("Enter route name");
      return;
    }
    if (!vehicleType) {
      alert("Set vehicle type");
      return;
    }
    if (!source) {
      setSourceError("Required.");
      hasError = true;
    }
    if (!destination) {
      setDestinationError("Required.");
      hasError = true;
    }
    const errors = [];
    middlePoints.forEach((val, idx) => {
      if (!val) {
        errors[idx] = "Required.";
        hasError = true;
      }
    });
    setMidErrors(errors);
    if (hasError) return;

    setLoading(true);
    try {
      const pointsArray = buildPointsArray();
      const totalprice = vehicleType.toLowerCase().includes("private")
        ? getTotalPricePrivate()
        : getTotalPriceShared();

      if (isEditing && editRoute?.id) {
        const { error } = await supabase
          .from("routes")
          .update({
            name: name.trim(),
            description,
            vehicleType,
            isActive,
            points: pointsArray,
            pricing: vehicleType.toLowerCase().includes("private")
              ? segments.map((s) => ({
                  from: s.from,
                  to: s.to,
                  distanceKm: s.distanceKm,
                  durationMin: s.durationMin,
                  price: calculatePrivatePrice(s.distanceKm, s.durationMin),
                }))
              : sharedRates,
            totalprice,
            createdByName: adminName,
            createdByRole: adminRole,
          })
          .eq("id", editRoute.id);

        if (error) throw error;
        alert("Route updated!");
      } else {
        const { error } = await supabase.from("routes").insert([
          {
            name: name.trim(),
            description,
            vehicleType,
            isActive,
            points: pointsArray,
            pricing: vehicleType.toLowerCase().includes("private")
              ? segments.map((s) => ({
                  from: s.from,
                  to: s.to,
                  distanceKm: s.distanceKm,
                  durationMin: s.durationMin,
                  price: calculatePrivatePrice(s.distanceKm, s.durationMin),
                }))
              : sharedRates,
            totalprice,
            createdByName: adminName,
            createdByRole: adminRole,
          },
        ]);
        if (error) throw error;
        alert("Route created!");
        setName("");
        setDescription("");
        setVehicleType("");
        setSource(null);
        setDestination(null);
        setMiddlePoints([]);
        setSegments([]);
        setIsActive(true);
        setSharedRates([]);
      }

      navigate("/AllRoutes");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={900} mx="auto" p={3}>
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={() => navigate(-1)} edge="start">
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" gutterBottom sx={{ ml: 1 }}>
          {isEditing ? "Edit Route" : "Create Route"}
        </Typography>
      </Box>
      <TextField
        label="Route Name"
        fullWidth
        margin="normal"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label="Description"
        fullWidth
        margin="normal"
        multiline
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <FormControl fullWidth margin="normal">
        <InputLabel id="veh-type-label">Vehicle Type</InputLabel>
        <Select
          labelId="veh-type-label"
          value={vehicleType}
          label="Vehicle Type"
          onChange={(e) => setVehicleType(e.target.value)}
        >
          {vehicleOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Source
        </Typography>
        <PlaceAutocomplete
          label="Start Point"
          value={source}
          onSelect={(p, err) => {
            setSourceError(err || "");
            setSource(p);
            setSourceInfo(p?.zoneInfo || "");
          }}
          errorMsg={sourceError}
          infoMsg={sourceInfo}
        />
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Mid Points
        </Typography>
        {middlePoints.map((pt, idx) => (
          <Box key={idx} display="flex" alignItems="center" mb={2}>
            <Box flexGrow={1}>
              <PlaceAutocomplete
                label={`Mid Point ${idx + 1}`}
                value={pt}
                onSelect={(p, err) => updateMidPoint(idx, p, err, p?.zoneInfo)}
                errorMsg={midErrors[idx]}
                infoMsg={midInfos[idx]}
              />
            </Box>
            <IconButton
              color="error"
              onClick={() => removeMidPoint(idx)}
              size="large"
            >
              <Delete />
            </IconButton>
          </Box>
        ))}
        <Button
          variant="outlined"
          startIcon={<AddCircleOutline />}
          onClick={addMidPoint}
        >
          Add Mid Point
        </Button>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Destination
        </Typography>
        <PlaceAutocomplete
          label="End Point"
          value={destination}
          onSelect={(p, err) => {
            setDestinationError(err || "");
            setDestination(p);
            setDestinationInfo(p?.zoneInfo || "");
          }}
          errorMsg={destinationError}
          infoMsg={destinationInfo}
        />
      </Box>

      {vehicleType &&
        vehicleType.toLowerCase().includes("shared") &&
        segments.length > 0 && (
          <Box my={2} p={2} bgcolor="#f2f2f2">
            <Typography variant="subtitle1">
              Manual Rates per Segment (Rs per person):
            </Typography>
            {segments.map((seg, idx) => (
              <TextField
                key={seg.id}
                label={`${seg.from} → ${seg.to} (Km: ${seg.distanceKm}, Min: ${seg.durationMin})`}
                fullWidth
                margin="dense"
                type="number"
                value={sharedRates[idx]?.rate || ""}
                onChange={(e) => handleSharedRateChange(idx, e.target.value)}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        )}

      {vehicleType &&
        vehicleType.toLowerCase().includes("private") &&
        segments.length > 0 && (
          <Box my={2} p={2} bgcolor="#eef6ef">
            <Typography variant="subtitle1">
              Calculated Prices per Segment:
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Segment</TableCell>
                  <TableCell>Distance (Km)</TableCell>
                  <TableCell>Duration (Min)</TableCell>
                  <TableCell>Price (Rs)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {segments.map((seg) => (
                  <TableRow key={seg.id}>
                    <TableCell>
                      {seg.from} → {seg.to}
                    </TableCell>
                    <TableCell>{seg.distanceKm}</TableCell>
                    <TableCell>{seg.durationMin}</TableCell>
                    <TableCell>
                      {calculatePrivatePrice(seg.distanceKm, seg.durationMin)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant="subtitle2" mt={2}>
              Total Private Vehicle Price: <b>Rs {getTotalPricePrivate()}</b>
            </Typography>
          </Box>
        )}

      <Divider sx={{ my: 4 }} />

      <Box display="flex" alignItems="center" mb={3}>
        <Typography>Route Active</Typography>
        <Switch
          sx={{ ml: 1 }}
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
      </Box>

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={loading}
        fullWidth
      >
        {loading
          ? isEditing
            ? "Updating..."
            : "Creating..."
          : isEditing
          ? "Update Route"
          : "Create Route"}
      </Button>
    </Box>
  );
}
