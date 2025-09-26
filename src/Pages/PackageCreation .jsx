import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  FormGroup,
  FormControlLabel,
  InputLabel,
  Paper,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
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
  { label: "Quick ", value: "quick", days: 8 },
  { label: "Normal ", value: "normal", days: 11 },
  { label: "Relax", value: "relax", days: 14 },
  { label: "Trekkers", value: "trekkers", days: 12 },
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
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [packageAddOns, setPackageAddOns] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddOnDialog, setShowAddOnDialog] = useState(false);
  const [vehiclePrices, setVehiclePrices] = useState({});
  const [newAddOn, setNewAddOn] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
  });
  const [uploadingAddOn, setUploadingAddOn] = useState(false);

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

  useEffect(() => {
    supabase
      .from("add_ons")
      .select("*")
      .then(({ data }) => {
        setAvailableAddOns(data || []);
      });
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

  //Add Ons

  const handleNewAddOnChange = (field, value) => {
    setNewAddOn((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewAddOnImageAdd = (files) => {
    if (!files.length) return;
    const newImages = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setNewAddOn((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages].slice(0, 5),
    }));
  };

  const handleNewAddOnImageRemove = (idx) => {
    setNewAddOn((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  const uploadNewAddOnImages = async () => {
    const uploadedUrls = [];
    for (const img of newAddOn.images) {
      if (img.url && !img.file) {
        uploadedUrls.push(img.url);
      } else if (img.file) {
        const ext = img.file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}.${ext}`;
        const path = `add_ons/${fileName}`;
        const { error } = await supabase.storage
          .from("add_ons")
          .upload(path, img.file);
        if (error) throw error;
        const { data } = supabase.storage.from("add_ons").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSaveNewAddOn = async () => {
    if (!newAddOn.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!newAddOn.price || isNaN(Number(newAddOn.price))) {
      alert("Price must be a valid number");
      return;
    }

    setUploadingAddOn(true);
    try {
      const uploadedUrls = await uploadNewAddOnImages();
      const payload = {
        title: newAddOn.title,
        description: newAddOn.description,
        price: Number(newAddOn.price),
        images: uploadedUrls,
      };
      const { data, error } = await supabase
        .from("add_ons")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // refresh add_ons list in PackageCreation
      setAvailableAddOns((prev) => [...prev, data]);

      alert("Add-on created successfully");
      setShowAddOnDialog(false);
      setNewAddOn({ title: "", description: "", price: "", images: [] });
    } catch (err) {
      alert("Failed to create add-on: " + err.message);
    }
    setUploadingAddOn(false);
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

    // Convert keys to string for reliable comparison
    const removedPoints = new Set(
      newDays[dayIdx].selectedPoints
        .filter((p) => !ordered.some((o) => o.id === p.id))
        .map((p) => String(p.id))
    );

    newDays[dayIdx].selectedPoints = ordered;

    // Cleanup using string keys to match removedPoints type
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

        // Also clear modes and selections of next day that belong to points not in nextDay.selectedPoints
        const nextDayRemoved = new Set(
          Object.keys(nextDay.pointModes).filter(
            (key) => !nextDay.selectedPoints.some((p) => String(p.id) === key)
          )
        );

        nextDayRemoved.forEach((p) => {
          delete nextDay.pointModes[p];
          delete nextDay.finalizedSightseeing[p];
          delete nextDay.finalizedHotel[p];
          delete nextDay.availableSightseeing[p];
          delete nextDay.availableHotels[p];
        });
      }
    }

    setLoading(true);

    for (const pt of ordered) {
      if (!newDays[dayIdx].availableSightseeing[pt.id]) {
        const searchKey = pt.name.split(",")[0].trim();
        const { data: see } = await supabase
          .from("sightseeing_points")
          .select()
          .eq("route_id", routeId);
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

  const normalizeAcType = (acType) => {
    if (!acType) return acType;
    const lower = acType.toLowerCase();
    if (lower.includes("non") && lower.includes("ac")) return "non_ac";
    if (lower.includes("ac")) return "ac";
    return lower;
  };

  const fetchVehiclePricingConfig = async (vehicle) => {
    try {
      const normAcType = normalizeAcType(vehicle.ac_type);

      const { data, error } = await supabase
        .from("vehicle_pricing_config")
        .select("*")
        .eq("vehicle_category", vehicle.vehicle_category.toLowerCase())
        .eq("ac_type", normAcType)
        .eq("ride_type", "two-way")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching vehicle_pricing_config:", error);
        return null;
      }

      if (!data) return null;

      const zones = Array.isArray(data.zone_name) ? data.zone_name : [];
      const clusters = Array.isArray(data.clusters) ? data.clusters : [];

      return { ...data, zone_name: zones, clusters };
    } catch (err) {
      console.warn("Exception fetching vehicle_pricing_config:", err);
      return null;
    }
  };

  const calculatePricing = async () => {
    if (!selectedVehicles.length || !days.length) {
      setPricingData(null);
      setVehiclePrices({});
      return;
    }

    const newVehiclePrices = {};

    for (const vehicleId of selectedVehicles) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) continue;

      const pricingConfigDb = await fetchVehiclePricingConfig(vehicle);

      let vehiclePricePerKm = 0;
      let fixedNightCharge = 0;
      let carrierCharge = 0;
      let zones = [];
      let clusters = [];
      let slabDistance = 0;
      let useSlab = false;

      if (pricingConfigDb) {
        vehiclePricePerKm =
          parseFloat(pricingConfigDb.vehicle_price_per_km) || 0;
        fixedNightCharge = parseFloat(pricingConfigDb.fixed_night_charge) || 0;
        carrierCharge = parseFloat(pricingConfigDb.carrier_charge) || 0;
        zones = Array.isArray(pricingConfigDb.zone_name)
          ? pricingConfigDb.zone_name
          : [];
        clusters = Array.isArray(pricingConfigDb.clusters)
          ? pricingConfigDb.clusters
          : [];
        slabDistance = parseFloat(pricingConfigDb.slab_distance) || 0;
        useSlab = pricingConfigDb.use_slab || false;
      } else {
        const category = vehicle.vehicle_category?.toLowerCase();
        const acType = vehicle.ac_type?.toLowerCase();
        if (category === "small") {
          vehiclePricePerKm = acType === "non ac" ? 14.5 : 16;
          fixedNightCharge = 500;
          if (vehicle.has_carrier) carrierCharge = 200;
        } else if (["medium", "large", "extra large"].includes(category)) {
          vehiclePricePerKm = acType === "non ac" ? 17 : 18.5;
          fixedNightCharge = 600;
          if (vehicle.has_carrier) carrierCharge = 250;
        } else {
          vehiclePricePerKm = 16;
          fixedNightCharge = 500;
          if (vehicle.has_carrier) carrierCharge = 200;
        }
      }

      console.log("Fetched Vehicle Pricing Config:");
      console.log("Zones:", zones);
      console.log("Clusters:", clusters);
      console.log("Slab Distance:", slabDistance);
      console.log("Use Slab:", useSlab);

      let grandVehicleTotal = 0;
      let grandSightseeingTotal = 0;
      let grandHotelTotal = 0;
      let grandAddOnsTotal = 0;

      const seenAddOns = new Set();
      for (const addOnId of packageAddOns) {
        if (!seenAddOns.has(addOnId)) {
          const item = availableAddOns.find((a) => a.id === addOnId);
          if (item) {
            grandAddOnsTotal += parseFloat(item.price) || 0;
            seenAddOns.add(addOnId);
          }
        }
      }

      const perDayDetails = [];

      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const day = days[dayIndex];
        let dayKms = 0;

        // Calculate total kms for the day
        for (let i = 0; i < day.selectedPoints.length - 1; i++) {
          const seg = getDistanceTimeBetween(
            day.selectedPoints[i],
            day.selectedPoints[i + 1]
          );
          if (seg && seg.distance) dayKms += seg.distance;
        }

        // Apply slab logic
        let fareDistance = dayKms;
        let slabApplied = false;

        if (useSlab && slabDistance > 0) {
          const allPointNames = day.selectedPoints.map((p) =>
            p.name.toLowerCase().trim()
          );

          // Check if any point matches a zone or cluster
          const matchesZoneOrCluster = allPointNames.some(
            (pointName) =>
              zones.some((z) => pointName.includes(z.toLowerCase())) ||
              clusters.some((c) => pointName.includes(c.toLowerCase()))
          );

          if (matchesZoneOrCluster && dayKms < slabDistance) {
            fareDistance = slabDistance;
            slabApplied = true;
          }
        }

        const dayVehicleTotal =
          fareDistance * vehiclePricePerKm + fixedNightCharge;

        // Sightseeing total
        let daySightseeingTotal = 0;
        for (const [pointId, sightseeingIds] of Object.entries(
          day.finalizedSightseeing || {}
        )) {
          const sightList = day.availableSightseeing[pointId] || [];
          (Array.isArray(sightseeingIds)
            ? sightseeingIds
            : [sightseeingIds]
          ).forEach((sid) => {
            const sItem = sightList.find((s) => s.id === sid);
            if (sItem) {
              daySightseeingTotal +=
                parseFloat(sItem.feesadult || 0) +
                parseFloat(sItem.feeschild || 0);
            }
          });
        }

        // Hotel total
        let dayHotelTotal = 0;
        for (const [pointId, hotelIds] of Object.entries(
          day.finalizedHotel || {}
        )) {
          const hotelList = day.availableHotels[pointId] || [];
          (Array.isArray(hotelIds) ? hotelIds : [hotelIds]).forEach((hid) => {
            const hItem = hotelList.find((h) => h.id === hid);
            if (hItem && hItem.manualprice) {
              dayHotelTotal += parseFloat(hItem.manualprice);
            }
          });
        }

        grandVehicleTotal += dayVehicleTotal;
        grandSightseeingTotal += daySightseeingTotal;
        grandHotelTotal += dayHotelTotal;

        perDayDetails.push({
          day: dayIndex + 1,
          dayKms,
          fareDistance,
          slabApplied,
          dayVehicleTotal,
          daySightseeingTotal,
          dayHotelTotal,
        });
      }

      const totalPrice =
        grandVehicleTotal +
        grandSightseeingTotal +
        grandHotelTotal +
        grandAddOnsTotal +
        carrierCharge;

      newVehiclePrices[vehicleId] = grandVehicleTotal + carrierCharge;

      setPricingData({
        perDayDetails,
        grandVehicleTotal,
        grandSightseeingTotal,
        grandHotelTotal,
        totalPrice,
        carrierCharge,
        vehiclePricePerKm,
        fixedNightCharge,
        grandAddOnsTotal,
      });
      setVehiclePrices(newVehiclePrices);
    }
  };

  React.useEffect(() => {
    calculatePricing();
  }, [selectedVehicles, days, routePoints, numDays]);

  useEffect(() => {
    if (location.state?.packageData) {
      const pkg = location.state.packageData;
      console.log("Received package data:", pkg);

      // ✅ Parse cover images safely
      let coverUrls = [];
      if (pkg.cover_image_url && pkg.cover_image_url !== "") {
        try {
          const parsedUrls = JSON.parse(pkg.cover_image_url);
          coverUrls = Array.isArray(parsedUrls) ? parsedUrls : [parsedUrls];
        } catch {
          coverUrls = [pkg.cover_image_url];
        }
      }
      const coverImages = coverUrls.map((url) => {
        if (url && !url.startsWith("http")) {
          const { publicURL } = supabase.storage
            .from("packages")
            .getPublicUrl(url);
          return { url: publicURL, file: null };
        }
        return { url, file: null };
      });

      setEditingPackageId(pkg.id || null);
      setPackageName(pkg.name || "");
      setCategory(pkg.category || "");
      setType(pkg.type || "");
      setRouteId(pkg.route?.id || "");

      // ✅ vehicles
      if (pkg.package_vehicles?.length > 0) {
        setSelectedVehicles(pkg.package_vehicles.map((pv) => pv.vehicle.id));
      }

      // ✅ Global add-ons only (package level)
      if (pkg.package_add_ons?.length > 0) {
        setPackageAddOns(
          pkg.package_add_ons
            .filter((pa) => !pa.package_day_id && !pa.package_day_point_id)
            .map((pa) => pa.add_on.id)
        );
      }

      setCoverImages(coverImages);

      if (Array.isArray(pkg.package_days)) {
        // ✅ Sort by correct field day_number
        const sortedDays = [...pkg.package_days].sort(
          (a, b) => a.day_number - b.day_number
        );

        const daysData = sortedDays.map((day) => {
          const finalizedSightseeing = {};
          const finalizedHotel = {};
          const pointModes = {};
          const finalizedAddOns = {};

          // ✅ handle day add-ons (package_day_id)
          const dayAddOns =
            pkg.package_add_ons?.filter(
              (ao) => ao.package_day_id === day.id && !ao.package_day_point_id
            ) || [];

          (day.package_day_points || []).forEach((pt) => {
            // ✅ Sightseeing (nested structure)
            if (pt.sightseeing && pt.sightseeing.length > 0) {
              finalizedSightseeing[pt.point_id] = pt.sightseeing.map(
                (s) => s.sightseeing_id?.id
              );

              if (finalizedSightseeing[pt.point_id].length > 0) {
                pointModes[pt.point_id] = pointModes[pt.point_id] || [];
                if (!pointModes[pt.point_id].includes("sightseeing")) {
                  pointModes[pt.point_id].push("sightseeing");
                }
              }
            }

            // ✅ Hotels (nested structure)
            if (pt.hotel && pt.hotel.length > 0) {
              finalizedHotel[pt.point_id] = pt.hotel.map((h) => h.hotel_id?.id);

              if (finalizedHotel[pt.point_id].length > 0) {
                pointModes[pt.point_id] = pointModes[pt.point_id] || [];
                if (!pointModes[pt.point_id].includes("stay")) {
                  pointModes[pt.point_id].push("stay");
                }
              }
            }

            // ✅ Point-level add-ons
            const pointAddOns =
              pkg.package_add_ons?.filter(
                (ao) => ao.package_day_point_id === pt.id
              ) || [];

            // Day-level add-ons for this day
            const dayAddOns =
              pkg.package_add_ons?.filter(
                (ao) => ao.package_day_id === day.id && !ao.package_day_point_id
              ) || [];

            // Merge day-level + point-level into finalizedAddOns
            finalizedAddOns[pt.point_id] = [
              ...pointAddOns.map((ao) => ao.add_on.id),
              ...dayAddOns.map((ao) => ao.add_on.id),
            ];

            if (finalizedAddOns[pt.point_id].length > 0) {
              pointModes[pt.point_id] = pointModes[pt.point_id] || [];
              if (!pointModes[pt.point_id].includes("others")) {
                pointModes[pt.point_id].push("others");
              }
            }
          });

          return {
            description: day.description || "",
            selectedPoints: (day.package_day_points || []).map((pt) => ({
              id: pt.point_id,
              name:
                pkg.route?.points?.find((p) => p.id === pt.point_id)?.name ||
                pt.point_id,
            })),
            pointModes,
            finalizedSightseeing,
            finalizedHotel,
            finalizedAddOns,
            availableSightseeing: {}, // will be fetched
            availableHotels: {}, // will be fetched
          };
        });

        setDays(daysData);
        setNumDays(daysData.length);

        // ✅ Fetch available sightseeing & hotels for each point
        (async () => {
          for (let d = 0; d < daysData.length; d++) {
            const day = daysData[d];
            for (const pt of day.selectedPoints) {
              const searchKey = pt.name.split(",")[0].trim();

              if (!day.availableSightseeing[pt.id]) {
                const { data: see } = await supabase
                  .from("sightseeing_points")
                  .select()
                  .eq("route_id", pkg.route?.id || "");
                day.availableSightseeing[pt.id] = see || [];
              }

              if (!day.availableHotels[pt.id]) {
                const { data: hotels } = await supabase
                  .from("hotels_model")
                  .select()
                  .ilike("location", `%${searchKey}%`);
                day.availableHotels[pt.id] = hotels || [];
              }
            }
          }
          setDays([...daysData]);
        })();
      } else {
        setDays([]);
        setNumDays(0);
      }

      setRoutePoints(pkg.route?.points || []);
    } else {
      // reset state for new package
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
      setPackageAddOns([]);
    }
  }, [location.state]);

  // Saving package to supabase
  const handleSavePackage = async () => {
    if (!packageName.trim()) {
      alert("Please enter a package name.");
      return;
    }
    if (!category || !type || !routeId || selectedVehicles.length === 0) {
      alert("Please select category, type, route, and vehicle(s).");
      return;
    }
    setLoading(true);

    try {
      // 📌 Upload images
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

      // 📌 Insert / Update package
      if (editingPackageId) {
        const { error } = await supabase
          .from("packages")
          .update({
            name: packageName,
            category,
            type,
            route_id: routeId,
            cover_image_url: imageUrls,
          })
          .eq("id", editingPackageId);
        if (error) throw error;

        // clear old days, add-ons, vehicles
        await supabase
          .from("package_days")
          .delete()
          .eq("package_id", editingPackageId);
        await supabase
          .from("package_add_ons")
          .delete()
          .eq("package_id", editingPackageId);
        await supabase
          .from("package_vehicles")
          .delete()
          .eq("package_id", editingPackageId);
      } else {
        const { data, error } = await supabase
          .from("packages")
          .insert({
            name: packageName,
            category,
            type,
            route_id: routeId,
            cover_image_url: imageUrls,
          })
          .select()
          .single();
        if (error) throw error;
        packageId = data.id;
      }

      // 📌 Insert package → vehicles join table with price per vehicle
      if (selectedVehicles.length > 0) {
        console.log("selectedVehicles to insert:", selectedVehicles);
        const vehicleRows = selectedVehicles.map((id) => ({
          package_id: packageId,
          vehicle_id: id,
          price: vehiclePrices[id] || 0,
        }));

        const { error: vehicleErr } = await supabase
          .from("package_vehicles")
          .upsert(vehicleRows, { onConflict: ["package_id", "vehicle_id"] });
        if (vehicleErr) throw vehicleErr;
      }

      // 📌 Insert package → add-ons join table
      if (packageAddOns.length > 0) {
        const addOnRows = packageAddOns.map((id) => ({
          package_id: packageId,
          add_on_id: id,
          package_day_id: null,
          package_day_point_id: null,
        }));
        const { error: addOnErr } = await supabase
          .from("package_add_ons")
          .insert(addOnRows);
        if (addOnErr) throw addOnErr;
      }

      // 📌 Insert package_days and package_day_points
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

        // ✅ Use already calculated price from pricingData
        const dayVehicleCost =
          pricingData?.perDayDetails?.[idx]?.dayVehicleTotal || 0;

        // Calculate sightseeing cost
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

        // Calculate hotel cost
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

        // Insert day points
        for (const p of day.selectedPoints) {
          const { data: dayPointData, error: dayPointErr } = await supabase
            .from("package_day_points")
            .insert({
              package_day_id: dayDbId,
              point_id: p.id,
              mode: day.pointModes[p.id] || null,
            })
            .select()
            .single();
          if (dayPointErr) throw dayPointErr;

          const dayPointId = dayPointData.id;

          // Insert sightseeing for this point
          const sightseeingIds = day.finalizedSightseeing[p.id] || [];
          if (sightseeingIds.length > 0) {
            const sightseeingRows = sightseeingIds.map((sid) => ({
              package_day_point_id: dayPointId,
              sightseeing_id: sid,
            }));
            const { error: sightError } = await supabase
              .from("package_day_point_sightseeing")
              .insert(sightseeingRows);
            if (sightError) throw sightError;
          }

          // Insert hotels for this point
          const hotelIds = day.finalizedHotel[p.id] || [];
          if (hotelIds.length > 0) {
            const hotelRows = hotelIds.map((hid) => ({
              package_day_point_id: dayPointId,
              hotel_id: hid,
            }));
            const { error: hotelError } = await supabase
              .from("package_day_point_hotels")
              .insert(hotelRows);
            if (hotelError) throw hotelError;
          }
        }

        if (day.finalizedAddOns) {
          for (const [pointId, addOnIds] of Object.entries(
            day.finalizedAddOns
          )) {
            if (!addOnIds || addOnIds.length === 0) continue;

            const point = day.selectedPoints.find((p) => p.id === pointId);
            const pointDbId = point?.dbId; 

            const addOnRows = addOnIds.map((id) => ({
              package_id: packageId,
              add_on_id: id,
              package_day_point_id: pointDbId || null,
              package_day_id: pointDbId ? null : dayDbId, 
            }));

            await supabase.from("package_add_ons").insert(addOnRows);
          }
        }
      }

      alert("Package saved successfully!");
      setEditingPackageId(null);
      setPackageName("");
      setCategory("");
      setType("");
      setRouteId("");
      setSelectedVehicles([]);
      setCommonVehicleId("");
      setPackageAddOns([]);
      setCoverImages([]);
      setDays([]);
      setNumDays(0);

      navigate("/packages");
    } catch (error) {
      console.error(error);
      alert("Error saving package. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
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
            <InputLabel>Vehicles</InputLabel>
            <Select
              multiple
              value={selectedVehicles}
              onChange={(e) => setSelectedVehicles(e.target.value)}
              input={<OutlinedInput label="Vehicles" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {selected.map((id) => {
                    const v = vehicles.find((veh) => veh.id === id);
                    return v ? (
                      <Chip
                        key={id}
                        label={v.model_name}
                        onDelete={() =>
                          setSelectedVehicles((prev) =>
                            prev.filter((vid) => vid !== id)
                          )
                        }
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {vehicles.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  <Checkbox checked={selectedVehicles.indexOf(v.id) > -1} />
                  <ListItemText
                    primary={`${v.model_name} (${v.seater_range || ""}) (${
                      v.vehicle_category || ""
                    })`}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Package Add-ons</InputLabel>
            <Select
              multiple
              value={packageAddOns}
              onChange={(e) => setPackageAddOns(e.target.value)}
              input={<OutlinedInput label="Package Add-ons" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {selected.map((id) => {
                    const a = availableAddOns.find((ao) => ao.id === id);
                    return a ? (
                      <Chip
                        key={id}
                        label={a.title}
                        onDelete={() =>
                          setPackageAddOns((prev) =>
                            prev.filter((aid) => aid !== id)
                          )
                        }
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {availableAddOns.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  <Checkbox checked={packageAddOns.indexOf(a.id) > -1} />
                  <ListItemText primary={`${a.title} (₹${a.price})`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowAddOnDialog(true)}
              sx={{ textTransform: "none" }}
            >
              + Add Add-On
            </Button>
          </Box>

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
                  onChange={(e) =>
                    handleDayPointsChange(dayIdx, e.target.value)
                  }
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

                      {/* Checkboxes for modes to allow multi-select */}
                      <FormControl component="fieldset" sx={{ mb: 2, ml: 1 }}>
                        <FormGroup row>
                          {["sightseeing", "stay", "others"].map((mode) => (
                            <FormControlLabel
                              key={mode}
                              control={
                                <Checkbox
                                  checked={
                                    day.pointModes[pt.id]?.includes(mode) ||
                                    false
                                  }
                                  onChange={(e) => {
                                    const currentModes =
                                      day.pointModes[pt.id] || [];
                                    let newModes = [];
                                    if (e.target.checked) {
                                      newModes = [...currentModes, mode];
                                    } else {
                                      newModes = currentModes.filter(
                                        (m) => m !== mode
                                      );
                                    }
                                    const newDays = [...days];
                                    if (!newDays[dayIdx].pointModes)
                                      newDays[dayIdx].pointModes = {};
                                    newDays[dayIdx].pointModes[pt.id] =
                                      newModes;
                                    setDays(newDays);
                                  }}
                                  disabled={loading}
                                />
                              }
                              label={
                                mode.charAt(0).toUpperCase() + mode.slice(1)
                              }
                            />
                          ))}
                        </FormGroup>
                      </FormControl>

                      {/* For each selected mode render multi-select checkboxes */}

                      {/* Sightseeing multi-select */}
                      {day.pointModes[pt.id]?.includes("sightseeing") && (
                        <FormControl sx={{ minWidth: 280, ml: 2, mb: 2 }}>
                          <InputLabel>Select Sightseeing</InputLabel>
                          <Select
                            multiple
                            value={day.finalizedSightseeing?.[pt.id] || []}
                            onChange={(e) => {
                              const newDays = [...days];
                              if (!newDays[dayIdx].finalizedSightseeing)
                                newDays[dayIdx].finalizedSightseeing = {};
                              newDays[dayIdx].finalizedSightseeing[pt.id] =
                                e.target.value;
                              setDays(newDays);
                            }}
                            input={<OutlinedInput label="Select Sightseeing" />}
                            renderValue={(selected) => (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                {selected.map((id) => {
                                  const s = (
                                    day.availableSightseeing?.[pt.id] || []
                                  ).find((x) => x.id === id);
                                  return s ? (
                                    <Chip key={id} label={s.place_name} />
                                  ) : null;
                                })}
                              </Box>
                            )}
                            disabled={loading}
                          >
                            {(day.availableSightseeing?.[pt.id] || []).map(
                              (s) => (
                                <MenuItem key={s.id} value={s.id}>
                                  <Checkbox
                                    checked={(
                                      day.finalizedSightseeing?.[pt.id] || []
                                    ).includes(s.id)}
                                  />
                                  <ListItemText
                                    primary={`${s.place_name} ${
                                      s.mode ? `(${s.mode})` : ""
                                    }`}
                                  />
                                </MenuItem>
                              )
                            )}
                          </Select>
                        </FormControl>
                      )}

                      {/* Hotel multi-select */}
                      {day.pointModes[pt.id]?.includes("stay") && (
                        <FormControl sx={{ minWidth: 280, ml: 2, mb: 2 }}>
                          <InputLabel>Select Hotels</InputLabel>
                          <Select
                            multiple
                            value={day.finalizedHotel?.[pt.id] || []}
                            onChange={(e) => {
                              const newDays = [...days];
                              if (!newDays[dayIdx].finalizedHotel)
                                newDays[dayIdx].finalizedHotel = {};
                              newDays[dayIdx].finalizedHotel[pt.id] =
                                e.target.value;
                              setDays(newDays);
                            }}
                            input={<OutlinedInput label="Select Hotels" />}
                            renderValue={(selected) => (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                {selected.map((id) => {
                                  const h = (
                                    day.availableHotels?.[pt.id] || []
                                  ).find((x) => x.id === id);
                                  return h ? (
                                    <Chip key={id} label={h.hotel_name} />
                                  ) : null;
                                })}
                              </Box>
                            )}
                            disabled={loading}
                          >
                            {(day.availableHotels?.[pt.id] || []).map((h) => (
                              <MenuItem key={h.id} value={h.id}>
                                <Checkbox
                                  checked={(
                                    day.finalizedHotel?.[pt.id] || []
                                  ).includes(h.id)}
                                />
                                <ListItemText primary={h.hotel_name} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Add-ons multi-select */}
                      {day.pointModes[pt.id]?.includes("others") && (
                        <FormControl sx={{ minWidth: 280, ml: 2, mb: 2 }}>
                          <InputLabel>Select Add-ons</InputLabel>
                          <Select
                            multiple
                            value={day.finalizedAddOns?.[pt.id] || []}
                            onChange={(e) => {
                              const newDays = [...days];
                              if (!newDays[dayIdx].finalizedAddOns)
                                newDays[dayIdx].finalizedAddOns = {};
                              newDays[dayIdx].finalizedAddOns[pt.id] =
                                e.target.value;
                              setDays(newDays);
                            }}
                            input={<OutlinedInput label="Select Add-ons" />}
                            renderValue={(selected) => (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                {selected.map((id) => {
                                  const ao = availableAddOns.find(
                                    (a) => a.id === id
                                  );
                                  return ao ? (
                                    <Chip key={id} label={ao.title} />
                                  ) : null;
                                })}
                              </Box>
                            )}
                            disabled={loading}
                          >
                            {availableAddOns.map((a) => (
                              <MenuItem key={a.id} value={a.id}>
                                <Checkbox
                                  checked={
                                    (
                                      day.finalizedAddOns?.[pt.id] || []
                                    ).indexOf(a.id) > -1
                                  }
                                />
                                <ListItemText
                                  primary={`${a.title} (₹${a.price})`}
                                />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* No data found displays */}
                      {day.pointModes[pt.id]?.includes("sightseeing") &&
                        (!day.availableSightseeing?.[pt.id] ||
                          day.availableSightseeing[pt.id].length === 0) && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            No sightseeing records found in DB for this point.
                          </Typography>
                        )}
                      {day.pointModes[pt.id]?.includes("stay") &&
                        (!day.availableHotels?.[pt.id] ||
                          day.availableHotels[pt.id].length === 0) && (
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
                              Distance/Time not found for {from.name} ➝{" "}
                              {to.name}
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
                {/* Pricing Calculation Details Per Day */}
              </Typography>
              <TableContainer>
                <Table size="small" aria-label="per-day pricing breakdown">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Vehicle (₹)</TableCell>
                      {/* <TableCell>Sightseeing (₹)</TableCell>
                      <TableCell>Hotels (₹)</TableCell> */}
                      <TableCell>Total (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pricingData.perDayDetails.map((day) => (
                      <React.Fragment key={day.day}>
                        <TableRow>
                          <TableCell>{`Day ${day.day}`}</TableCell>
                          <TableCell>
                            {day.dayVehicleTotal.toFixed(2)}
                          </TableCell>
                          {/* <TableCell>
                            {day.daySightseeingTotal.toFixed(2)}
                          </TableCell>
                          <TableCell>{day.dayHotelTotal.toFixed(2)}</TableCell> */}
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

                            {/* {day.daySightseeingDetails.length > 0 && (
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
                            )} */}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}

                    <TableRow>
                      <TableCell colSpan={1} fontWeight="bold">
                        Carrier Charge
                      </TableCell>
                      <TableCell colSpan={3} />
                      {/* <TableCell fontWeight="bold">
                        {pricingData.carrierCharge.toFixed(2)}
                      </TableCell> */}
                    </TableRow>
                    <TableRow>
                      {/* <TableCell colSpan={4} fontWeight="bold">
                        Add-ons Total
                      </TableCell>
                      <TableCell fontWeight="bold">
                        {(pricingData.grandAddOnsTotal || 0).toFixed(2)}
                      </TableCell> */}
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={4} fontWeight="bold">
                        Grand Total Price
                      </TableCell>
                      <TableCell
                        style={{ display: "flex", justifyContent: "flex-end" }}
                        fontWeight="bold"
                      >
                        Rs {pricingData.totalPrice.toFixed(2)}
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
                selectedVehicles.length === 0
              }
            >
              Save Package
            </Button>
          </Box>
        </Paper>
      </Box>
      <Dialog
        open={showAddOnDialog}
        onClose={() => setShowAddOnDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Add-On</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={newAddOn.title}
            onChange={(e) => handleNewAddOnChange("title", e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Description"
            value={newAddOn.description}
            onChange={(e) =>
              handleNewAddOnChange("description", e.target.value)
            }
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
          <TextField
            label="Price"
            type="number"
            value={newAddOn.price}
            onChange={(e) => handleNewAddOnChange("price", e.target.value)}
            fullWidth
            margin="normal"
          />

          <Button variant="outlined" component="label" sx={{ mt: 2 }}>
            Upload Images
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) handleNewAddOnImageAdd(e.target.files);
              }}
            />
          </Button>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            {newAddOn.images.map((img, idx) => (
              <Box key={idx} sx={{ position: "relative" }}>
                <img
                  src={img.url}
                  alt={`new_addon_${idx}`}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 6,
                    objectFit: "cover",
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleNewAddOnImageRemove(idx)}
                  sx={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowAddOnDialog(false)}
            disabled={uploadingAddOn}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveNewAddOn}
            disabled={uploadingAddOn}
            variant="contained"
          >
            {uploadingAddOn ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
