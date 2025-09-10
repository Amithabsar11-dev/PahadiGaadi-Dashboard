import React, { useEffect, useState, useMemo } from "react";

import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  Checkbox,
  OutlinedInput,
  ListItemText,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";

import { supabase } from "../lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

const PACKAGE_CATEGORIES = [
  { label: "4 dham", value: "4dham" },
  { label: "3 dham", value: "3dham" },
  { label: "2 dham", value: "2dham" },
];

const PACKAGE_TYPES = [
  { label: "Quick (8 days)", value: "quick", days: 8 },
  { label: "Normal (11 days)", value: "normal", days: 11 },
  { label: "Relax (14 days)", value: "relax", days: 14 },
  { label: "Trekkers (12 days)", value: "trekkers", days: 12 },
];

export default function PackageCreation() {
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [numDays, setNumDays] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState("");
  const [routePoints, setRoutePoints] = useState([]);
  const [days, setDays] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [commonVehicleId, setCommonVehicleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [packageName, setPackageName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverImages, setCoverImages] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const [editingPackageId, setEditingPackageId] = useState(null);

  useEffect(() => {
    supabase
      .from("vehicles_model")
      .select(
        "id, model_name, image_url, rating, seater_range, service_name, ac_type, has_carrier, vehicle_category"
      )
      .then(({ data }) => setVehicles(data || []));

    supabase
      .from("routes")
      .select("id, name, points")
      .then(({ data }) => setRoutes(data || []));
  }, []);

  const handleCategoryChange = (val) => {
    setCategory(val);
    setType("");
    setNumDays(0);
    setDays([]);
    setRouteId("");
    setRoutePoints([]);
    setCommonVehicleId("");
    setPricingData(null);
  };

  const handleTypeChange = (val) => {
    setType(val);
    const selected = PACKAGE_TYPES.find((t) => t.value === val);
    const count = selected ? selected.days : 0;
    setNumDays(count);
    setDays(
      Array.from({ length: count }).map(() => ({
        description: "",
        selectedPoints: [],
        pointModes: {},
        finalizedSightseeing: {},
        finalizedHotel: {},
        availableSightseeing: {},
        availableHotels: {},
      }))
    );
    setPricingData(null);
  };

  const handleRouteSelect = (id) => {
    setRouteId(id);
    const route = routes.find((r) => r.id === id);
    if (route?.points?.length) {
      setRoutePoints(route.points);
    } else {
      setRoutePoints([]);
    }
    setDays((d) =>
      d.map((day) => ({
        ...day,
        selectedPoints: [],
        sightseeingPoints: [],
        stayPoints: [],
        availableSightseeing: {},
        availableHotels: {},
      }))
    );
    setPricingData(null);
  };

  const startPoint = useMemo(
    () => (routePoints.length ? routePoints[0] : null),
    [routePoints]
  );

  const usedPointsExcludingDay = (dayIdx) => {
    const used = new Set();
    days.forEach((day, idx) => {
      if (idx === dayIdx) return;
      day.selectedPoints.forEach((p) => {
        if (p.id !== startPoint?.id) used.add(p.id);
      });
    });
    return used;
  };

  const availablePointsForDay = (dayIdx) => {
    const used = usedPointsExcludingDay(dayIdx);
    return routePoints.filter((p) => !used.has(p.id));
  };

  const endPoint = useMemo(
    () => (routePoints.length ? routePoints[routePoints.length - 1] : null),
    [routePoints]
  );

  const normalizeLastDayStartPoint = (dayIdx, selected) => {
    if (dayIdx !== numDays - 1 || !endPoint) return selected;
    if (!selected.find((p) => p.id === endPoint.id)) {
      return [...selected, endPoint];
    }
    const without = selected.filter((p) => p.id !== endPoint.id);
    return [...without, endPoint];
  };

  const isPointDisabled = (pointName, currentDayIdx) => {
    const routeLastPointName = routePoints[routePoints.length - 1]?.name || "";

    if (pointName === routeLastPointName) {
      return false;
    }

    for (let i = 0; i < currentDayIdx; i++) {
      if (days[i]?.selectedPoints?.some((p) => p.name === pointName)) {
        return true;
      }
    }
    return false;
  };

  const handleAddImages = async (files) => {
    if (!files.length) return;

    const filesToAdd = Array.from(files).slice(0, 5 - coverImages.length);
    const newImages = filesToAdd.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setCoverImages((prev) => [...prev, ...newImages]);
    for (let img of newImages) {
      try {
        const ext = img.file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}.${ext}`;
        const path = `packages/${fileName}`;
        const { error } = await supabase.storage
          .from("packages")
          .upload(path, img.file);
        if (error) throw error;
        const { data } = supabase.storage.from("packages").getPublicUrl(path);
        setCoverImages((prev) =>
          prev.map((i) =>
            i.url === img.url ? { ...i, url: data.publicUrl, file: null } : i
          )
        );
      } catch {}
    }
  };

  const removeImage = (index) => {
    setCoverImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDayPointsChange = async (dayIdx, val) => {
    const allowed = new Set(
      availablePointsForDay(dayIdx)
        .map((p) => p.id)
        .concat(days[dayIdx].selectedPoints.map((p) => p.id))
    );
    const filtered = val.filter((p) => allowed.has(p.id));
    const ordered = normalizeLastDayStartPoint(dayIdx, filtered);
    const newDays = [...days];

    const removedPoints = new Set(
      newDays[dayIdx].selectedPoints
        .filter((p) => !ordered.some((o) => o.id === p.id))
        .map((p) => p.id)
    );

    newDays[dayIdx].selectedPoints = ordered;

    Object.keys(newDays[dayIdx].pointModes).forEach((p) => {
      if (removedPoints.has(p)) delete newDays[dayIdx].pointModes[p];
    });

    Object.keys(newDays[dayIdx].finalizedSightseeing).forEach((p) => {
      if (removedPoints.has(p)) delete newDays[dayIdx].finalizedSightseeing[p];
    });

    Object.keys(newDays[dayIdx].finalizedHotel).forEach((p) => {
      if (removedPoints.has(p)) delete newDays[dayIdx].finalizedHotel[p];
    });

    Object.keys(newDays[dayIdx].availableSightseeing).forEach((p) => {
      if (removedPoints.has(p)) delete newDays[dayIdx].availableSightseeing[p];
    });

    Object.keys(newDays[dayIdx].availableHotels).forEach((p) => {
      if (removedPoints.has(p)) delete newDays[dayIdx].availableHotels[p];
    });

    if (ordered.length > 0 && dayIdx < newDays.length - 1) {
      const lastPoint = ordered[ordered.length - 1];
      const nextDay = newDays[dayIdx + 1];
      if (
        nextDay.selectedPoints.length === 0 ||
        nextDay.selectedPoints[0].id !== lastPoint.id
      ) {
        nextDay.selectedPoints = [lastPoint];
      }
    }

    setLoading(true);

    for (const pt of ordered) {
      if (!newDays[dayIdx].availableSightseeing[pt.id]) {
        const searchKey = pt.name.split(",")[0].trim();
        const { data: see } = await supabase
          .from("sightseeing_points")
          .select()
          .ilike("place_name", `%${searchKey}%`);
        newDays[dayIdx].availableSightseeing[pt.id] = see || [];
      }
      if (!newDays[dayIdx].availableHotels[pt.id]) {
        const searchKey = pt.name.split(",")[0].trim();
        const { data: hotels } = await supabase
          .from("hotels_model")
          .select()
          .ilike("location", `%${searchKey}%`);
        newDays[dayIdx].availableHotels[pt.id] = hotels || [];
      }
    }

    setDays(newDays);
    setLoading(false);
    setPricingData(null);
  };

  const handlePointModeChange = (dayIdx, point, mode) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const next = { ...d };
        next.pointModes = { ...next.pointModes, [point.id]: mode };
        if (mode === "sightseeing") delete next.finalizedHotel[point.id];
        if (mode === "stay") delete next.finalizedSightseeing[point.id];
        return next;
      })
    );
    setPricingData(null);
  };

  const handleFinalizeSightseeing = (dayIdx, point, id) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const next = { ...d };
        next.finalizedSightseeing = {
          ...next.finalizedSightseeing,
          [point.id]: id,
        };
        return next;
      })
    );
    setPricingData(null);
  };

  const handleFinalizeHotel = (dayIdx, point, id) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const next = { ...d };
        next.finalizedHotel = { ...next.finalizedHotel, [point.id]: id };
        return next;
      })
    );
    setPricingData(null);
  };

  const handleCommonVehicleChange = (vehicleId) => {
    setCommonVehicleId(vehicleId);
    setPricingData(null);
  };

  const getDistanceTimeBetween = (from, to) => {
    if (!routePoints?.length) return null;
    const fromIdx = routePoints.findIndex((p) => p.id === from.id);
    const toIdx = routePoints.findIndex((p) => p.id === to.id);
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return null;
    const segment = routePoints[toIdx];
    return {
      distance: segment.distanceKm,
      time: segment.estimatedDuration,
    };
  };

  const calculatePricing = async () => {
    if (!commonVehicleId || days.length === 0) {
      setPricingData(null);
      return;
    }
    const vehicle = vehicles.find((v) => v.id === commonVehicleId);
    if (!vehicle) {
      setPricingData(null);
      return;
    }
    let vehiclePricePerKm = 0;
    let fixedNightCharge = 0;
    let carrierCharge = 0;
    const category = vehicle.vehicle_category?.toLowerCase();
    const acType = vehicle.ac_type?.toLowerCase();
    const hasCarrier = vehicle.has_carrier;
    if (category === "small") {
      vehiclePricePerKm = acType === "non ac" ? 14.5 : 16;
      fixedNightCharge = 500;
      if (hasCarrier) carrierCharge = 200;
    } else if (
      category === "medium" ||
      category === "large" ||
      category === "extra large"
    ) {
      vehiclePricePerKm = acType === "non ac" ? 17 : 18.5;
      fixedNightCharge = 600;
      if (hasCarrier) carrierCharge = 250;
    } else {
      vehiclePricePerKm = 16;
      fixedNightCharge = 500;
      if (hasCarrier) carrierCharge = 200;
    }

    const perDayDetails = [];
    let grandVehicleTotal = 0;
    let grandSightseeingTotal = 0;
    let grandHotelTotal = 0;

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];
      let dayKms = 0;
      for (let i = 0; i < day.selectedPoints.length - 1; i++) {
        const seg = getDistanceTimeBetween(
          day.selectedPoints[i],
          day.selectedPoints[i + 1]
        );
        if (seg && seg.distance) dayKms += seg.distance;
      }
      const dayVehicleTotal = dayKms * vehiclePricePerKm + fixedNightCharge;

      let daySightseeingTotal = 0;
      const daySightseeingDetails = [];
      for (const [pointId, sightseeingId] of Object.entries(
        day.finalizedSightseeing
      )) {
        const sList = day.availableSightseeing[pointId] || [];
        const sItem = sList.find((s) => s.id === sightseeingId);
        if (sItem) {
          const feesAdult = parseFloat(sItem.fees_adult) || 0;
          const feesChild = parseFloat(sItem.fees_child) || 0;
          const totalFees = feesAdult + feesChild;
          daySightseeingTotal += totalFees;
          daySightseeingDetails.push({
            pointName:
              routePoints.find((p) => p.id === pointId)?.name || "Unknown",
            sightseeingName: sItem.place_name,
            feesAdult,
            feesChild,
            totalFees,
          });
        }
      }

      let dayHotelTotal = 0;
      const dayHotelDetails = [];
      for (const [pointId, hotelId] of Object.entries(day.finalizedHotel)) {
        const hList = day.availableHotels[pointId] || [];
        const hItem = hList.find((h) => h.id === hotelId);
        if (hItem && hItem.manual_price) {
          const manualPriceNum = parseFloat(hItem.manual_price) || 0;
          dayHotelTotal += manualPriceNum;
          dayHotelDetails.push({
            pointName:
              routePoints.find((p) => p.id === pointId)?.name || "Unknown",
            hotelName: hItem.hotel_name,
            price: manualPriceNum,
          });
        }
      }

      grandVehicleTotal += dayVehicleTotal;
      grandSightseeingTotal += daySightseeingTotal;
      grandHotelTotal += dayHotelTotal;

      perDayDetails.push({
        day: dayIndex + 1,
        dayVehicleTotal,
        daySightseeingTotal,
        dayHotelTotal,
        daySightseeingDetails,
        dayHotelDetails,
        dayKms,
      });
    }

    const totalPrice =
      grandVehicleTotal +
      grandSightseeingTotal +
      grandHotelTotal +
      carrierCharge;

    setPricingData({
      perDayDetails,
      grandVehicleTotal,
      grandSightseeingTotal,
      grandHotelTotal,
      totalPrice,
      carrierCharge,
      vehiclePricePerKm,
      fixedNightCharge,
      numDays,
    });
  };

  React.useEffect(() => {
    calculatePricing();
  }, [commonVehicleId, days, routePoints, numDays]);

  useEffect(() => {
  if (location.state?.packageData) {
    const pkg = location.state.packageData;
    console.log("Received package data:", pkg);
    console.log("Package cover_image_url:", pkg.cover_image_url);

    let coverUrls = [];

    if (pkg.cover_image_url && pkg.cover_image_url !== "") {
      try {
        const parsedUrls = JSON.parse(pkg.cover_image_url);
        if (Array.isArray(parsedUrls)) {
          coverUrls = parsedUrls;
        } else {
          coverUrls = [parsedUrls];
        }
      } catch {
        // If parsing fails but string is non-empty, treat as single URL
        coverUrls = [pkg.cover_image_url];
      }
    }

    const coverImages = coverUrls.map((url) => {
      if (url && !url.startsWith("http")) {
        // Convert storage path to public URL
        const { publicURL } = supabase.storage.from("packages").getPublicUrl(url);
        return { url: publicURL, file: null };
      }
      return { url, file: null };
    });

    console.log("Mapped coverImages:", coverImages);

    setEditingPackageId(pkg.id || null);
    setPackageName(pkg.name || "");
    setCategory(pkg.category || "");
    setType(pkg.type || "");
    setRouteId(pkg.route?.id || "");
    setCommonVehicleId(pkg.vehicle?.id || "");

    setCoverImages(coverImages);

    if (Array.isArray(pkg.package_days)) {
      const daysData = pkg.package_days.map((day) => ({
        description: day.description || "",
        selectedPoints: (day.package_points || day.package_day_points || []).map((pt) => ({
          id: pt.point_id,
          name: pkg.route?.points?.find((p) => p.id === pt.point_id)?.name || pt.point_id,
        })),
        pointModes: {},
        finalizedSightseeing: {},
        finalizedHotel: {},
        availableSightseeing: {},
        availableHotels: {},
      }));

      setDays(daysData);
      setNumDays(daysData.length);
    } else {
      setDays([]);
      setNumDays(0);
    }

    setRoutePoints(pkg.route?.points || []);
  } else {
    // Reset to initial empty state
    setEditingPackageId(null);
    setPackageName("");
    setCategory("");
    setType("");
    setRouteId("");
    setCommonVehicleId("");
    setCoverImages([]);
    setDays([]);
    setNumDays(0);
    setRoutePoints([]);
  }
}, [location.state]);


  // Saving package to supabase
  const handleSavePackage = async () => {
    if (!packageName.trim()) {
      alert("Please enter a package name.");
      return;
    }
    if (!category || !type || !routeId || !commonVehicleId) {
      alert("Please select category, type, route, and vehicle.");
      return;
    }
    setLoading(true);

    try {
      const imageUrls = [];
      for (let img of coverImages) {
        if (img.url && !img.file) {
          imageUrls.push(img.url);
        } else if (img.file) {
          const ext = img.file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}.${ext}`;
          const path = `packages/${fileName}`;
          const { error } = await supabase.storage
            .from("packages")
            .upload(path, img.file);
          if (error) throw error;
          const { data } = supabase.storage.from("packages").getPublicUrl(path);
          imageUrls.push(data.publicUrl);
        }
      }

      let packageId = editingPackageId;

      if (editingPackageId) {
        // Update existing package
        const { error } = await supabase
          .from("packages")
          .update({
            name: packageName,
            category,
            type,
            route_id: routeId,
            vehicle_id: commonVehicleId,
            cover_image_url: imageUrls,
          })
          .eq("id", editingPackageId);
        if (error) throw error;
        await supabase
          .from("package_days")
          .delete()
          .eq("package_id", editingPackageId);
      } else {
        // Insert new package
        const { data, error } = await supabase
          .from("packages")
          .insert({
            name: packageName,
            category,
            type,
            route_id: routeId,
            vehicle_id: commonVehicleId,
            cover_image_url: imageUrls,
          })
          .select()
          .single();
        if (error) throw error;
        packageId = data.id;
      }

      // Insert package days and points
      for (let idx = 0; idx < days.length; idx++) {
        const day = days[idx];
        const dayNumber = idx + 1;
        let dayKms = 0;
        for (let i = 0; i < day.selectedPoints.length - 1; i++) {
          const seg = getDistanceTimeBetween(
            day.selectedPoints[i],
            day.selectedPoints[i + 1]
          );
          if (seg && seg.distance) dayKms += seg.distance;
        }

        const vehicle = vehicles.find((v) => v.id === commonVehicleId);
        let vehiclePricePerKm = 0;
        let fixedNightCharge = 0;
        if (vehicle) {
          const category = vehicle.vehicle_category?.toLowerCase();
          const acType = vehicle.ac_type?.toLowerCase();
          if (category === "small") {
            vehiclePricePerKm = acType === "non ac" ? 14.5 : 16;
            fixedNightCharge = 500;
          } else if (["medium", "large", "extra large"].includes(category)) {
            vehiclePricePerKm = acType === "non ac" ? 17 : 18.5;
            fixedNightCharge = 600;
          } else {
            vehiclePricePerKm = 16;
            fixedNightCharge = 500;
          }
        }

        const dayVehicleCost = dayKms * vehiclePricePerKm + fixedNightCharge;

        let sightseeingTotal = 0;
        for (const [pointId, sightseeingId] of Object.entries(
          day.finalizedSightseeing
        )) {
          const sightList = day.availableSightseeing[pointId] || [];
          const item = sightList.find((s) => s.id === sightseeingId);
          if (item) {
            const feesAdult = parseFloat(item.fees_adult) || 0;
            const feesChild = parseFloat(item.fees_child) || 0;
            sightseeingTotal += feesAdult + feesChild;
          }
        }

        let hotelTotal = 0;
        for (const [pointId, hotelId] of Object.entries(day.finalizedHotel)) {
          const hotelList = day.availableHotels[pointId] || [];
          const hotel = hotelList.find((h) => h.id === hotelId);
          if (hotel && hotel.manual_price) {
            hotelTotal += parseFloat(hotel.manual_price) || 0;
          }
        }

        const { data: dayData, error: dayErr } = await supabase
          .from("package_days")
          .insert({
            package_id: packageId,
            day_number: dayNumber,
            vehicle_distance_km: dayKms,
            vehicle_price: dayVehicleCost,
            sightseeing_price: sightseeingTotal,
            hotel_price: hotelTotal,
            description: day.description,
          })
          .select()
          .single();
        if (dayErr) throw dayErr;

        const dayDbId = dayData.id;

        const dayPointsData = day.selectedPoints.map((p) => ({
          package_day_id: dayDbId,
          point_id: p.id,
          mode: day.pointModes[p.id] || null,
          sightseeing_id: day.finalizedSightseeing[p.id] || null,
          hotel_id: day.finalizedHotel[p.id] || null,
        }));

        if (dayPointsData.length) {
          const { error: pointsErr } = await supabase
            .from("package_points")
            .insert(dayPointsData);
          if (pointsErr) throw pointsErr;
        }
      }

      alert("Package saved successfully!");
      // Reset form states here, navigate or clear editingPackageId
      setEditingPackageId(null);
      setPackageName("");
      setCategory("");
      setType("");
      setRouteId("");
      setCommonVehicleId("");
      setCoverImages([]);
      setDays([]);
      setNumDays(0);

      navigate("/packages"); // Redirect to package list after save
    } catch (error) {
      console.error(error);
      alert("Error saving package. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", my: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" mb={2} color="primary">
          Create Package
        </Typography>

        {/* Package Name Input */}
        <TextField
          label="Package Name"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          fullWidth
          sx={{ mb: 3, maxWidth: 500 }}
          disabled={loading}
        />

        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            component="label"
            disabled={coverImages.length >= 5 || loading}
          >
            Upload Images (max 5)
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleAddImages(e.target.files);
                  e.target.value = null;
                }
              }}
              disabled={loading}
            />
          </Button>

          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {coverImages.map((img, index) => (
              <Box
                key={index}
                sx={{
                  position: "relative",
                  width: 120,
                  height: 80,
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <img
                  src={img.url}
                  alt={`cover_img_${index}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeImage(index)}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Category & Type */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={loading}
            >
              {PACKAGE_CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={loading}
            >
              {PACKAGE_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Route */}
        <FormControl sx={{ minWidth: 350, mb: 3 }}>
          <InputLabel>Route</InputLabel>
          <Select
            value={routeId}
            label="Route"
            onChange={(e) => handleRouteSelect(e.target.value)}
            disabled={loading}
          >
            {routes.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Vehicle */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Vehicle (applies to all days)</InputLabel>
          <Select
            value={commonVehicleId}
            label="Vehicle (applies to all days)"
            onChange={(e) => handleCommonVehicleChange(e.target.value)}
            disabled={loading}
          >
            {vehicles.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.model_name} {v.seater_range && `(${v.seater_range})`}{" "}
                {v.vehicle_category && `(${v.vehicle_category})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Days */}
        {days.map((day, dayIdx) => (
          <Paper key={dayIdx} sx={{ p: 2, mb: 2, background: "#f8f9fd" }}>
            <Typography variant="h6" gutterBottom>
              Day {dayIdx + 1}
            </Typography>
            <TextField
              label="Day Description"
              value={days[dayIdx].description}
              onChange={(e) => {
                const newDays = [...days];
                newDays[dayIdx].description = e.target.value;
                setDays(newDays);
              }}
              fullWidth
              multiline
              rows={2}
              sx={{ mb: 2 }}
              disabled={loading}
            />

            <FormControl sx={{ minWidth: 300, mt: 2 }}>
              <InputLabel>Points (in order)</InputLabel>
              <Select
                multiple
                value={day.selectedPoints}
                input={<OutlinedInput label="Points (in order)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selected.map((p) => (
                      <Chip key={p.id} label={p.name} />
                    ))}
                  </Box>
                )}
                onChange={(e) => handleDayPointsChange(dayIdx, e.target.value)}
                disabled={loading}
              >
                {routePoints.map((pt) => (
                  <MenuItem
                    key={pt.id}
                    value={pt}
                    disabled={isPointDisabled(pt.name, dayIdx)}
                  >
                    <Checkbox
                      checked={day.selectedPoints.some((p) => p.id === pt.id)}
                    />
                    <ListItemText primary={pt.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mt: 2 }}>
              {day.selectedPoints.length === 0 && (
                <Typography color="text.secondary" fontSize={14}>
                  No points selected for this day.
                </Typography>
              )}

              {day.selectedPoints.map((pt, idx) => (
                <React.Fragment key={pt.id}>
                  <Paper
                    sx={{ p: 1.5, mb: 2, background: "#fff", boxShadow: 0 }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {pt.name}
                    </Typography>

                    <FormControl sx={{ minWidth: 220, mr: 2 }}>
                      <InputLabel>Option</InputLabel>
                      <Select
                        value={day.pointModes[pt.id] || ""}
                        label="Option"
                        onChange={(e) =>
                          handlePointModeChange(dayIdx, pt, e.target.value)
                        }
                        disabled={loading}
                      >
                        <MenuItem value="sightseeing">Sightseeing</MenuItem>
                        <MenuItem value="stay">Stay (Hotel)</MenuItem>
                      </Select>
                    </FormControl>

                    {day.pointModes[pt.id] === "sightseeing" && (
                      <FormControl sx={{ minWidth: 280, ml: 2 }}>
                        <InputLabel>Select Sightseeing</InputLabel>
                        <Select
                          value={day.finalizedSightseeing[pt.id] || ""}
                          label="Select Sightseeing"
                          onChange={(e) =>
                            handleFinalizeSightseeing(
                              dayIdx,
                              pt,
                              e.target.value
                            )
                          }
                          disabled={loading}
                        >
                          {(day.availableSightseeing[pt.id] || []).map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.place_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    {day.pointModes[pt.id] === "stay" && (
                      <FormControl sx={{ minWidth: 280, ml: 2 }}>
                        <InputLabel>Select Hotel</InputLabel>
                        <Select
                          value={day.finalizedHotel[pt.id] || ""}
                          label="Select Hotel"
                          onChange={(e) =>
                            handleFinalizeHotel(dayIdx, pt, e.target.value)
                          }
                          disabled={loading}
                        >
                          {(day.availableHotels[pt.id] || []).map((h) => (
                            <MenuItem key={h.id} value={h.id}>
                              {h.hotel_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    {(!day.availableSightseeing[pt.id] ||
                      day.availableSightseeing[pt.id].length === 0) &&
                      day.pointModes[pt.id] === "sightseeing" && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          No sightseeing records found in DB for this point.
                        </Typography>
                      )}

                    {(!day.availableHotels[pt.id] ||
                      day.availableHotels[pt.id].length === 0) &&
                      day.pointModes[pt.id] === "stay" && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          No hotel records found in DB for this point.
                        </Typography>
                      )}
                  </Paper>

                  {idx < day.selectedPoints.length - 1 && (
                    <Box sx={{ ml: 2, mb: 2 }}>
                      {(() => {
                        const from = day.selectedPoints[idx];
                        const to = day.selectedPoints[idx + 1];
                        const seg = getDistanceTimeBetween(from, to);
                        return seg ? (
                          <Typography variant="body2" color="text.secondary">
                            {from.name} ➝ {to.name}: {seg.distance} km,{" "}
                            {seg.time}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="error">
                            Distance/Time not found for {from.name} ➝ {to.name}
                          </Typography>
                        );
                      })()}
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Paper>
        ))}

        {loading && <CircularProgress sx={{ mt: 2 }} />}

        {/* Pricing Display: per day breakdown */}
        {pricingData && (
          <>
            <Typography variant="h5" color="primary" mb={2}>
              Pricing Calculation Details Per Day
            </Typography>
            <TableContainer>
              <Table size="small" aria-label="per-day pricing breakdown">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Vehicle (₹)</TableCell>
                    <TableCell>Sightseeing (₹)</TableCell>
                    <TableCell>Hotels (₹)</TableCell>
                    <TableCell>Total (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pricingData.perDayDetails.map((day) => (
                    <React.Fragment key={day.day}>
                      <TableRow>
                        <TableCell>{`Day ${day.day}`}</TableCell>
                        <TableCell>{day.dayVehicleTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          {day.daySightseeingTotal.toFixed(2)}
                        </TableCell>
                        <TableCell>{day.dayHotelTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          {(
                            day.dayVehicleTotal +
                            day.daySightseeingTotal +
                            day.dayHotelTotal
                          ).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          sx={{ pl: 4, bgcolor: "#f9f9f9" }}
                        >
                          <Typography variant="subtitle2">
                            Vehicle details:
                          </Typography>
                          <Typography
                            variant="body2"
                            component="div"
                            sx={{ pl: 2 }}
                          >
                            {`Distance: ${day.dayKms.toFixed(
                              2
                            )} km × ₹${pricingData.vehiclePricePerKm.toFixed(
                              2
                            )} + Fixed Night Charge: ₹${
                              pricingData.fixedNightCharge
                            }`}
                          </Typography>

                          {day.daySightseeingDetails.length > 0 && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                Sightseeing details:
                              </Typography>
                              {day.daySightseeingDetails.map((s, i) => (
                                <Typography
                                  key={i}
                                  variant="body2"
                                  component="div"
                                  sx={{ pl: 2 }}
                                >
                                  {`${
                                    s.sightseeingName
                                  }: ₹${s.totalFees.toFixed(
                                    2
                                  )} (Adult: ₹${s.feesAdult.toFixed(
                                    2
                                  )}, Child: ₹${s.feesChild.toFixed(2)})`}
                                </Typography>
                              ))}
                            </>
                          )}

                          {day.dayHotelDetails.length > 0 && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                Hotel details:
                              </Typography>
                              {day.dayHotelDetails.map((h, i) => (
                                <Typography
                                  key={i}
                                  variant="body2"
                                  component="div"
                                  sx={{ pl: 2 }}
                                >
                                  {`${h.hotelName}: ₹${h.price.toFixed(2)}`}
                                </Typography>
                              ))}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}

                  <TableRow>
                    <TableCell colSpan={1} fontWeight="bold">
                      Carrier Charge
                    </TableCell>
                    <TableCell colSpan={3} />
                    <TableCell fontWeight="bold">
                      {pricingData.carrierCharge.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={4} fontWeight="bold">
                      Grand Total Price
                    </TableCell>
                    <TableCell fontWeight="bold">
                      {pricingData.totalPrice.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Box sx={{ mt: 4, textAlign: "right" }}>
          <Button
            variant="contained"
            onClick={handleSavePackage}
            disabled={
              loading ||
              !packageName.trim() ||
              !category ||
              !type ||
              !routeId ||
              !commonVehicleId
            }
          >
            Save Package
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
