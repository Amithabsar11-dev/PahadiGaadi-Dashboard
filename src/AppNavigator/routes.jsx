import AdminSignIn from "../Auth/SignIn";
import Layout from "../Components/Layout";
import AdminSignUp from "../Auth/SignUp";
import Dashboard from "../Pages/Dashboard";
import Orders from "../Pages/Orders";
import Trips from "../Pages/Trips";
import RoutesManager from "../Pages/Routes";
import AllRoutesScreen from "../Pages/AllRoutesScreen";
import VehicleForm from "../Pages/Vehicles";
import VehicleList from "../Pages/VehicleList";
import HotelsAdminPanel from "../Pages/Hotels";
import OrderDetails from "../Pages/OrderDetails";
import Pricing from "../Pages/Pricing";
import PackageCreation from "../Pages/PackageCreation ";
import Sightseeing from "../Pages/Sightseeing";
import PackageListScreen from "../Pages/PackageListScreen";
import PartnerVerificationList from "../Pages/PartnerVerificationList";
import PartnerDocuments from "../Pages/PartnerDocuments";
import DriverProfilesScreen from "../Pages/DriverProfilesScreen";
import CustomerProfilesScreen from "../Pages/CustomerProfilesScreen";
import BookingRequests from "../Pages/BookingRequests";
import AddOnsManagement from "../Pages/AddOnsManagement";
import ZonesClusters from "../Pages/ZonesClusters";
import VehiclePricingConfig from "../Pages/VehiclePricingConfig";
import HotelBookings from "../Pages/HotelBookings";
import ViewTrip from "../Pages/Trips/ViewTrip";
import Contact from "../Pages/contact";
import { Navigate } from "react-router-dom";

const routes = [
  { path: "/", element: <Navigate to="/signin" /> },
  { path: "/signin", element: <AdminSignIn /> },
  { path: "/signup", element: <AdminSignUp /> },
  {
    path: "/", 
    element: <Layout />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "orders", element: <Orders /> },
      { path: "trips", element: <Trips /> },
      { path: "view-trip/:tripId", element: <ViewTrip /> },
      { path: "routes", element: <RoutesManager /> },
      { path: "AllRoutes", element: <AllRoutesScreen /> },
      { path: "Addons", element: <AddOnsManagement /> },
      { path: "vehicles", element: <VehicleForm /> },
      { path: "vehiclelist", element: <VehicleList /> },
      { path: "hotels", element: <HotelsAdminPanel /> },
      { path: "orders/:id", element: <OrderDetails /> },
       { path: "hotelbookings", element: <HotelBookings /> },
      { path: "pricing", element: <Pricing /> },
      { path: "package", element: <PackageCreation /> },
      { path: "sightseeing", element: <Sightseeing /> },
      { path: "packages", element: <PackageListScreen /> },
      { path: "bookingrequests", element: <BookingRequests /> },
      { path: "drivers", element: <DriverProfilesScreen /> },
      { path: "customers", element: <CustomerProfilesScreen /> },
      { path: "partner-verification", element: <PartnerVerificationList /> },
      { path: "partner-documents/:id", element: <PartnerDocuments /> },
      { path: "ZonesClusters", element: <ZonesClusters /> },
      { path: "VehiclePricingConfig", element: <VehiclePricingConfig /> },
      { path: "Contact", element: <Contact /> },
    ],
      },
];

export default routes;
