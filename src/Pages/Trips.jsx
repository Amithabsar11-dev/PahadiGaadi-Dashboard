// src/pages/Trips.jsx
import React, { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import LiveTrips from "./Trips/LiveTrips";
import AddTrip from "./Trips/AddTrip";
import AllTrips from "./Trips/AllTrips";
import ViewTrip from "./Trips/ViewTrip";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      Role="tabpanel"
      hidden={value !== index}
      id={`trip-tabpanel-${index}`}
      aria-labelledby={`trip-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Trips() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Trips
      </Typography>
      <Tabs
        value={tabIndex}
        onChange={handleChange}
        aria-label="Trips Tabs"
        variant="scrollable"
        scrollButtons="auto"
      >
        {/* <Tab label="Live Trips" /> */}
        <Tab label="All Trips" />
        <Tab label="Add Trip" />
        {/* <Tab label="View Trip" /> */}
      </Tabs>
      {/* <TabPanel value={tabIndex} index={0}>
        <LiveTrips />
      </TabPanel> */}
       <TabPanel value={tabIndex} index={0}>
        <AllTrips />
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <AddTrip />
      </TabPanel>

      {/* <TabPanel value={tabIndex} index={3}>
        <ViewTrip />
      </TabPanel> */}
    </Box>
  );
}
