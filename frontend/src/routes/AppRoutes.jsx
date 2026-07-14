import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";

import Dashboard from "../pages/Dashboard/Dashboard";
import NotFound from "../pages/NotFound/NotFound";

// Vendors
import VendorList from "../pages/Vendors/VendorList";
import AddVendor from "../pages/Vendors/AddVendor";

// Purchase Orders
import PurchaseOrderList from "../pages/PurchaseOrders/PurchaseOrderList";
import PurchaseOrderCreate from "../pages/PurchaseOrders/PurchaseOrderCreate";

// Invoices
import InvoiceList from "../pages/Invoices/InvoiceList";
import InvoiceCreate from "../pages/Invoices/InvoiceCreate";
import InvoiceDetails from "../pages/Invoices/InvoiceDetails";

// Approvals
import ApprovalsList from "../pages/Approvals/ApprovalsList";

// Payments
import PaymentsList from "../pages/Payments/PaymentsList";
import PaymentCreate from "../pages/Payments/PaymentCreate";

// Three-Way Matching
import MatchingList from "../pages/ThreeWayMatching/MatchingList";
import MatchingDetail from "../pages/ThreeWayMatching/MatchingDetail";

// Tickets
import TicketList from "../pages/Tickets/TicketList";

// Notifications
import NotificationsList from "../pages/Notifications/NotificationsList";

// Users
import UsersList from "../pages/Users/UsersList";
import UserCreate from "../pages/Users/UserCreate";

import Reports from "../pages/Reports/Reports";

import Settings from "../pages/Settings/Settings";

import ProtectedRoute from "../components/auth/ProtectedRoute";

import Forbidden from "../pages/Forbidden/Forbidden";

// Auth
import Login from "../pages/Auth/Login";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />

      {/* Root Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Dashboard Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Vendors */}
        <Route path="/vendors" element={<VendorList />} />
        <Route path="/vendors/new" element={<AddVendor />} />

        {/* Purchase Orders */}
        <Route path="/purchase-orders" element={<PurchaseOrderList />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderCreate />} />

        {/* Invoices */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/new" element={<InvoiceCreate />} />
        <Route path="/invoices/:id" element={<InvoiceDetails />} />

        {/* Three-Way Matching */}
        <Route path="/three-way-matching" element={<MatchingList />} />
        <Route path="/three-way-matching/:id" element={<MatchingDetail />} />

        {/* Tickets */}
        <Route path="/tickets" element={<TicketList />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsList />} />

        {/* Approvals */}
        <Route path="/approvals" element={<ApprovalsList />} />

        {/* Payments */}
        <Route path="/payments" element={<PaymentsList />} />
        <Route path="/payments/new" element={<PaymentCreate />} />

        {/* Users */}
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/new" element={<UserCreate />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 403 */}
      <Route path="/403" element={<Forbidden />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;