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
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [packageAddOns, setPackageAddOns] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddOnDialog, setShowAddOnDialog] = useState(false);
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
    const vehicleIdForPricing = selectedVehicles.length
      ? selectedVehicles[0]
      : null;

    if (!vehicleIdForPricing || days.length === 0) {
      setPricingData(null);
      return;
    }

    const vehicle = vehicles.find((v) => v.id === vehicleIdForPricing);
    if (!vehicle) {
      setPricingData(null);
      return;
    }

    // --- vehicle pricing rules ---
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
    } else if (["medium", "large", "extra large"].includes(category)) {
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

    // 🚩 FIX: keep add-ons total outside of day loop
    let grandAddOnsTotal = 0;

    // package-level add-ons
    for (const addOnId of packageAddOns) {
      const item = availableAddOns.find((a) => a.id === addOnId);
      if (item) grandAddOnsTotal += parseFloat(item.price) || 0;
    }

    // day-level add-ons
    for (let d = 0; d < days.length; d++) {
      const day = days[d];
      if (day.finalizedAddOns) {
        for (const addOnIds of Object.values(day.finalizedAddOns)) {
          for (const addOnId of addOnIds) {
            const item = availableAddOns.find((a) => a.id === addOnId);
            if (item) grandAddOnsTotal += parseFloat(item.price) || 0;
          }
        }
      }
    }

    // calculate per-day vehicle/sightseeing/hotel
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

      // sightseeing
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

      // hotels
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
      grandAddOnsTotal +
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
      grandAddOnsTotal,
    });
  };

  React.useEffect(() => {
    calculatePricing();
  }, [selectedVehicles, days, routePoints, numDays]);

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

      console.log("Mapped coverImages:", coverImages);

      setEditingPackageId(pkg.id || null);
      setPackageName(pkg.name || "");
      setCategory(pkg.category || "");
      setType(pkg.type || "");
      setRouteId(pkg.route?.id || "");
      if (pkg.package_vehicles && pkg.package_vehicles.length > 0) {
        setSelectedVehicles(pkg.package_vehicles.map((pv) => pv.vehicle.id));
      }

      // ✅ add-ons
      if (pkg.package_add_ons && pkg.package_add_ons.length > 0) {
        setPackageAddOns(pkg.package_add_ons.map((pa) => pa.add_on.id));
      }

      setCoverImages(coverImages);

      if (Array.isArray(pkg.package_days)) {
        const daysData = pkg.package_days.map((day) => {
          const finalizedSightseeing = {};
          const finalizedHotel = {};
          const pointModes = {};
          const finalizedAddOns = {};
          const availableSightseeing = {};
          const availableHotels = {};

          // preload sightseeing + hotels + modes
          day.package_day_points.forEach((pt) => {
            if (pt.sightseeing) {
              finalizedSightseeing[pt.point_id] = pt.sightseeing.id;
              pointModes[pt.point_id] = "sightseeing";

              // make sure dropdown has the selected sightseeing option
              availableSightseeing[pt.point_id] = [pt.sightseeing];
            }
            if (pt.hotel) {
              finalizedHotel[pt.point_id] = pt.hotel.id;
              pointModes[pt.point_id] = "stay";

              // make sure dropdown has the selected hotel option
              availableHotels[pt.point_id] = [pt.hotel];
            }
            if (pt.mode === "others") {
              pointModes[pt.point_id] = "others";
              finalizedAddOns[pt.point_id] =
                day.package_add_ons?.map((ao) => ao.add_on.id) || [];
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
            availableSightseeing,
            availableHotels,
          };
        });

        setDays(daysData);
        setNumDays(daysData.length);

        (async () => {
          for (let d = 0; d < daysData.length; d++) {
            const day = daysData[d];
            for (const pt of day.selectedPoints) {
              const searchKey = pt.name.split(",")[0].trim();

              if (!day.availableSightseeing[pt.id]) {
                const { data: see } = await supabase
                  .from("sightseeing_points")
                  .select()
                  .ilike("place_name", `%${searchKey}%`);
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

      // 📌 Insert package → vehicles join table
      if (selectedVehicles.length > 0) {
        const vehicleRows = selectedVehicles.map((id) => ({
          package_id: packageId,
          vehicle_id: id,
        }));
        const { error: vehicleErr } = await supabase
          .from("package_vehicles")
          .insert(vehicleRows);
        if (vehicleErr) throw vehicleErr;
      }

      // 📌 Insert package → add-ons join table
      if (packageAddOns.length > 0) {
        const addOnRows = packageAddOns.map((id) => ({
          package_id: packageId,
          add_on_id: id,
          package_day_id: null,
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

        const vehicle = vehicles.find((v) => v.id === selectedVehicles[0]); // pricing based on first vehicle
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
            .from("package_day_points")
            .insert(dayPointsData);
          if (pointsErr) throw pointsErr;
        }

        // 📌 Insert day-level add-ons
        if (day.finalizedAddOns) {
          for (const addOnIds of Object.values(day.finalizedAddOns)) {
            const dayAddOnRows = addOnIds.map((id) => ({
              package_id: packageId,
              add_on_id: id,
              package_day_id: dayDbId,
            }));
            if (dayAddOnRows.length) {
              const { error: dayAddOnErr } = await supabase
                .from("package_add_ons")
                .insert(dayAddOnRows);
              if (dayAddOnErr) throw dayAddOnErr;
            }
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
    <><Box sx={{ maxWidth: 1200, mx: "auto", my: 3 }}>
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
          disabled={loading} />

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
              } }
              disabled={loading} />
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
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  return v ? <Chip key={id} label={v.model_name} /> : null;
                })}
              </Box>
            )}
          >
            {vehicles.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                <Checkbox checked={selectedVehicles.indexOf(v.id) > -1} />
                <ListItemText
                  primary={`${v.model_name} (${v.seater_range || ""}) (${v.vehicle_category || ""})`} />
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
                  return a ? <Chip key={id} label={a.title} /> : null;
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
              } }
              fullWidth
              multiline
              rows={2}
              sx={{ mb: 2 }}
              disabled={loading} />

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
                      checked={day.selectedPoints.some((p) => p.id === pt.id)} />
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
                        onChange={(e) => handlePointModeChange(dayIdx, pt, e.target.value)}
                        disabled={loading}
                      >
                        <MenuItem value="sightseeing">Sightseeing</MenuItem>
                        <MenuItem value="stay">Stay (Hotel)</MenuItem>
                        <MenuItem value="others">others</MenuItem>
                      </Select>
                    </FormControl>

                    {day.pointModes[pt.id] === "sightseeing" && (
                      <FormControl sx={{ minWidth: 280, ml: 2 }}>
                        <InputLabel>Select Sightseeing</InputLabel>
                        <Select
                          value={day.finalizedSightseeing[pt.id] || ""}
                          label="Select Sightseeing"
                          onChange={(e) => handleFinalizeSightseeing(
                            dayIdx,
                            pt,
                            e.target.value
                          )}
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
                          onChange={(e) => handleFinalizeHotel(dayIdx, pt, e.target.value)}
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

                    {day.pointModes[pt.id] === "others" && (
                      <FormControl sx={{ minWidth: 280, ml: 2 }}>
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
                          } }
                          input={<OutlinedInput label="Select Add-ons" />}
                          renderValue={(selected) => (
                            <Box
                              sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
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
                        >
                          {availableAddOns.map((a) => (
                            <MenuItem key={a.id} value={a.id}>
                              <Checkbox
                                checked={day.finalizedAddOns?.[pt.id]?.indexOf(a.id) >
                                  -1} />
                              <ListItemText
                                primary={`${a.title} (₹${a.price})`} />
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
                            )} + Fixed Night Charge: ₹${pricingData.fixedNightCharge}`}
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
                                  {`${s.sightseeingName}: ₹${s.totalFees.toFixed(
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
                      Add-ons Total
                    </TableCell>
                    <TableCell fontWeight="bold">
                      {(pricingData.grandAddOnsTotal || 0).toFixed(2)}
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
            disabled={loading ||
              !packageName.trim() ||
              !category ||
              !type ||
              !routeId ||
              selectedVehicles.length === 0}
          >
            Save Package
          </Button>
        </Box>
      </Paper>
    </Box><Dialog open={showAddOnDialog} onClose={() => setShowAddOnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Add-On</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={newAddOn.title}
            onChange={(e) => handleNewAddOnChange("title", e.target.value)}
            fullWidth
            margin="normal" />
          <TextField
            label="Description"
            value={newAddOn.description}
            onChange={(e) => handleNewAddOnChange("description", e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal" />
          <TextField
            label="Price"
            type="number"
            value={newAddOn.price}
            onChange={(e) => handleNewAddOnChange("price", e.target.value)}
            fullWidth
            margin="normal" />

          <Button variant="outlined" component="label" sx={{ mt: 2 }}>
            Upload Images
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) handleNewAddOnImageAdd(e.target.files);
              } } />
          </Button>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            {newAddOn.images.map((img, idx) => (
              <Box key={idx} sx={{ position: "relative" }}>
                <img
                  src={img.url}
                  alt={`new_addon_${idx}`}
                  style={{ width: 80, height: 80, borderRadius: 6, objectFit: "cover" }} />
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
          <Button onClick={() => setShowAddOnDialog(false)} disabled={uploadingAddOn}>
            Cancel
          </Button>
          <Button onClick={handleSaveNewAddOn} disabled={uploadingAddOn} variant="contained">
            {uploadingAddOn ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog></>

  );
}
