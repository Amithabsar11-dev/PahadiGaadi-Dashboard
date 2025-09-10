import React, { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import PrivateTrip from "../ViewTrip/PrivateTrip";
import SharedTrip from "../ViewTrip/SharedTrip";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`view-trip-tabpanel-${index}`}
      aria-labelledby={`view-trip-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ViewTrip() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        View Trip
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        aria-label="View Trip Subtabs"
      >
        <Tab label="Private Trip" />
        <Tab label="Shared Trip" />
      </Tabs>

      <TabPanel value={tabIndex} index={0}>
        <PrivateTrip />
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <SharedTrip />
      </TabPanel>
    </Box>
  );
}
