import React, { useEffect, useState, useMemo } from "react";
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
  Chip,
  CircularProgress,
  Stack,
  Avatar,
  Grid,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { supabase } from "../lib/supabase";

export default function CustomerProfiles() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [filterName, setFilterName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterEmail, setFilterEmail] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [open, setOpen] = useState(false);

  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [filterName, filterPhone, filterEmail]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    let { data, error } = await supabase
      .from("profiles")
      .select(
        `id, userName, phone, email, favouritePlace, favouriteHobby, wallet_balance, profileImage`
      );
    if (error) {
      alert("Failed to fetch customers: " + error.message);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers || [];
    if (filterName.trim()) {
      const lowName = filterName.toLowerCase();
      filtered = filtered.filter((c) =>
        (c.userName || "").toLowerCase().includes(lowName)
      );
    }
    if (filterPhone.trim()) {
      filtered = filtered.filter((c) => (c.phone || "").includes(filterPhone));
    }
    if (filterEmail.trim()) {
      const lowEmail = filterEmail.toLowerCase();
      filtered = filtered.filter((c) =>
        (c.email || "").toLowerCase().includes(lowEmail)
      );
    }
    return filtered.sort((a, b) =>
      (a.userName || "")
        .toLowerCase()
        .localeCompare((b.userName || "").toLowerCase())
    );
  }, [customers, filterName, filterPhone, filterEmail]);

  const handleOpenDialog = (customer) => {
    setSelectedCustomer(customer);
    setWalletAmount("");
    setWalletReason("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <Paper
      sx={{
        p: 3,
        background: "linear-gradient(120deg, #fffde7 0%, #f5f5f5 100%)",
      }}
    >
      <Typography variant="h4" gutterBottom color="primary">
        Customer Profiles
      </Typography>

      {/* Filter Section */}
      <Box
        sx={{
          p: 2,
          mb: 3,
          background: "#f7fafc",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Search by Name"
              fullWidth
              size="small"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
              placeholder="Search by Phone"
              fullWidth
              size="small"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              placeholder="Search by Email"
              fullWidth
              size="small"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{ borderRadius: 3, boxShadow: 2 }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Favourite Place</TableCell>
                  <TableCell>Favourite Hobby</TableCell>
                  <TableCell>Wallet (₹)</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          {customer.profileImage ? (
                            <Avatar src={customer.profileImage} />
                          ) : (
                            <Avatar sx={{ bgcolor: "#fbc02d" }}>
                              {customer.userName
                                ? customer.userName.charAt(0).toUpperCase()
                                : "?"}
                            </Avatar>
                          )}
                          <Typography variant="subtitle1" fontWeight="bold">
                            {customer.userName || "-"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.favouritePlace || "-"}</TableCell>
                      <TableCell>{customer.favouriteHobby || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={`₹${(customer.wallet_balance ?? 0).toFixed(
                            2
                          )}`}
                          color={
                            customer.wallet_balance > 0 ? "primary" : "default"
                          }
                          variant="outlined"
                          icon={<AccountBalanceWalletIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleOpenDialog(customer)}
                        >
                          Add Penalty
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          <TablePagination
            component="div"
            count={filteredCustomers.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </>
      )}

      {/* Wallet Adjustment Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>
          Add Penalty for {selectedCustomer?.userName || ""}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Penalty Amount"
            type="number"
            fullWidth
            variant="outlined"
            margin="dense"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            inputProps={{ min: 0.01 }}
            disabled={submitting}
          />
          <TextField
            label="Reason"
            multiline
            rows={3}
            fullWidth
            margin="dense"
            value={walletReason}
            onChange={(e) => setWalletReason(e.target.value)}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!walletAmount || Number(walletAmount) <= 0) {
                alert("Please enter a positive amount");
                return;
              }
              if (!walletReason.trim()) {
                alert("Please enter reason");
                return;
              }
              try {
                setSubmitting(true);
                const currentBalance = Number(
                  selectedCustomer.wallet_balance ?? 0
                );
                const newBalance =
                  currentBalance - Math.abs(Number(walletAmount));
                const { data, error } = await supabase
                  .from("profiles")
                  .update({ wallet_balance: newBalance })
                  .eq("id", selectedCustomer.id)
                  .select();

                if (error) throw error;

                alert("Penalty added successfully");

                if (data && data.length > 0) {
                  setCustomers((prev) =>
                    prev.map((c) =>
                      c.id === selectedCustomer.id
                        ? { ...c, wallet_balance: data[0].wallet_balance }
                        : c
                    )
                  );
                } else {
                  fetchCustomers();
                }

                setOpen(false);
                setSubmitting(false);
              } catch (err) {
                alert("Failed to update wallet: " + err.message);
                setSubmitting(false);
              }
            }}
            variant="contained"
            color="error"
            disabled={submitting}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
