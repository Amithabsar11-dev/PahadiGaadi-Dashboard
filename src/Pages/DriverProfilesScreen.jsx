import React, { useState, useEffect, useMemo } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Stack,
  Avatar,
  Tooltip,
  Grid,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import { supabase } from "../lib/supabase";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function DriverProfiles() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState("incentive");
  const [submitting, setSubmitting] = useState(false);

  // FILTER UI state
  const [filterName, setFilterName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterLicense, setFilterLicense] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data: driversData, error: errDrivers } = await supabase
        .from("driver_profiles")
        .select(
          `
          id,
          name,
          phone,
          wallet_balance,
          driver_documents(is_verified)
        `
        );
      if (errDrivers) throw errDrivers;
      setDrivers(driversData || []);
    } catch (error) {
      alert("Failed to load drivers: " + (error.message || error));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Reset page whenever filters change
  useEffect(() => {
    setPage(0);
  }, [filterName, filterPhone, filterLicense]);

  const filteredDrivers = useMemo(() => {
    let filtered = [...drivers];
    if (filterName.trim()) {
      filtered = filtered.filter((d) =>
        (d.name || "").toLowerCase().includes(filterName.trim().toLowerCase())
      );
    }
    if (filterPhone.trim()) {
      filtered = filtered.filter((d) =>
        String(d.phone || "").includes(filterPhone.trim())
      );
    }
    if (filterLicense) {
      filtered = filtered.filter((d) => {
        const isVerified = d.driver_documents?.is_verified === true;
        return filterLicense === "verified" ? isVerified : !isVerified;
      });
    }
    return filtered.sort((a, b) =>
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
    );
  }, [drivers, filterName, filterPhone, filterLicense]);

  const paginatedDrivers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredDrivers.slice(start, start + rowsPerPage);
  }, [filteredDrivers, page, rowsPerPage]);

  const openAdjustDialog = (driver) => {
    setSelectedDriver(driver);
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustType("incentive");
    setOpenDialog(true);
  };

  const closeAdjustDialog = () => {
    setOpenDialog(false);
    setSelectedDriver(null);
  };

  const submitAdjustment = async () => {
    if (!adjustAmount || Number(adjustAmount) <= 0) {
      alert("Please enter a positive amount.");
      return;
    }
    if (!adjustReason.trim()) {
      alert("Please provide a reason.");
      return;
    }
    if (!selectedDriver) return;

    setSubmitting(true);
    try {
      const currentBalance = Number(selectedDriver.wallet_balance || 0);
      let delta = Number(adjustAmount);
      if (adjustType === "penalty") delta = -Math.abs(delta);

      const newBalance = currentBalance + delta;

      const { error: updateError } = await supabase
        .from("driver_profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", selectedDriver.id);
      if (updateError) throw updateError;

      alert(
        `Wallet ${
          adjustType === "incentive" ? "credited" : "debited"
        } successfully.`
      );
      closeAdjustDialog();
      fetchDrivers();
    } catch (error) {
      alert("Failed to update wallet: " + (error.message || error));
    }
    setSubmitting(false);
  };

  return (
    <Paper sx={{ p: 3, background: "linear-gradient(120deg, #f8fafc 0 50%, #e3f2fd 100%)" }}>
      <Typography variant="h4" gutterBottom color="primary">
        Driver Profiles
      </Typography>

      {/* Filters */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          background: "#e9f5f1",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              variant="outlined"
              placeholder="Search by Name"
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: "#fff" }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
              variant="outlined"
              placeholder="Search by Phone"
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocalPhoneIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: "#fff" }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Select
              value={filterLicense}
              onChange={(e) => setFilterLicense(e.target.value)}
              displayEmpty
              variant="outlined"
              fullWidth
              size="small"
              sx={{ bgcolor: "#fff" }}
            >
              <MenuItem value="">
                <em>All License Status</em>
              </MenuItem>
              <MenuItem value="verified">
                <VerifiedUserIcon sx={{ mr: 1, fontSize: 16 }} />
                Verified only
              </MenuItem>
              <MenuItem value="not_verified">
                <ErrorOutlineIcon sx={{ mr: 1, fontSize: 16 }} />
                Not Verified only
              </MenuItem>
            </Select>
          </Grid>
        </Grid>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Wallet&nbsp;(₹)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDrivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No drivers found.
                  </TableCell>
                </TableRow>
              )}
              {paginatedDrivers.map((driver) => {
                const isVerified = driver.driver_documents?.is_verified === true;
                return (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: "#0097a7" }}>
                          {driver.name?.[0]?.toUpperCase() || "?"}
                        </Avatar>
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          color="text.primary"
                        >
                          {driver.name || "-"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{driver.phone || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={isVerified ? "Verified" : "Not Verified"}
                        color={isVerified ? "success" : "warning"}
                        size="small"
                        icon={
                          isVerified ? (
                            <VerifiedUserIcon fontSize="small" />
                          ) : (
                            <ErrorOutlineIcon fontSize="small" />
                          )
                        }
                        variant={isVerified ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`₹${driver.wallet_balance?.toFixed(2) ?? "0.00"}`}
                        color={driver.wallet_balance > 0 ? "success" : "default"}
                        size="medium"
                        icon={<AccountBalanceWalletIcon fontSize="small" />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Credit or debit driver wallet">
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="small"
                          onClick={() => openAdjustDialog(driver)}
                        >
                          Adjust Wallet
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredDrivers.length > rowsPerPage && (
            <TablePagination
              component="div"
              count={filteredDrivers.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          )}
        </TableContainer>
      )}

      {/* Wallet Adjust Dialog */}
      <Dialog
        open={openDialog}
        onClose={closeAdjustDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, boxShadow: 3 } }}
      >
        <DialogTitle sx={{ background: "#1976d2", color: "#fff" }}>
          {adjustType === "incentive" ? "Add Incentive" : "Add Penalty"} for{" "}
          <b>{selectedDriver?.name || ""}</b>
        </DialogTitle>
        <DialogContent>
          <Select
            label="Adjustment Type"
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value)}
            fullWidth
            sx={{ mt: 3, mb: 2 }}
            disabled={submitting}
          >
            <MenuItem value="incentive">Incentive</MenuItem>
            <MenuItem value="penalty">Penalty</MenuItem>
          </Select>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            variant="outlined"
            sx={{ my: 1 }}
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            inputProps={{ min: 0 }}
            disabled={submitting}
          />
          <TextField
            label="Reason"
            multiline
            minRows={3}
            fullWidth
            variant="outlined"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdjustDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submitAdjustment}
            variant="contained"
            disabled={submitting}
            color={adjustType === "incentive" ? "success" : "error"}
          >
            {adjustType === "incentive" ? "Credit" : "Debit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
