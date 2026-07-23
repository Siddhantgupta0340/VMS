import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";

import Dashboard from "../pages/Dashboard/Dashboard";
import NotFound from "../pages/NotFound/NotFound";

// Vendors
import VendorList from "../pages/Vendors/VendorList";
import AddVendor from "../pages/Vendors/AddVendor";
import FinanceHeadVendorReview from "../pages/Vendors/FinanceHeadVendorReview";

// Purchase Orders
import PurchaseOrderList from "../pages/PurchaseOrders/PurchaseOrderList";
import PurchaseOrderCreate from "../pages/PurchaseOrders/PurchaseOrderCreate";
import PurchaseOrderDetails from "../pages/PurchaseOrders/PurchaseOrderDetails";

// Invoices
import InvoiceList from "../pages/Invoices/InvoiceList";
import InvoiceDetails from "../pages/Invoices/InvoiceDetails";
import InvoiceCreate from "../pages/Invoices/InvoiceCreate";

// Approvals
import ApprovalsList from "../pages/Approvals/ApprovalsList";
import PaymentApprovalDetails from "../pages/Approvals/PaymentApprovalDetails";

// Payments
import PaymentsList from "../pages/Payments/PaymentsList";
import PaymentCreate from "../pages/Payments/PaymentCreate";

// Three-Way Matching
import MatchingList from "../pages/ThreeWayMatching/MatchingList";
import MatchingDetail from "../pages/ThreeWayMatching/MatchingDetail";
import ReceiptDocuments from "../pages/ReceiptDocuments/ReceiptDocuments";

// Notifications
import NotificationsList from "../pages/Notifications/NotificationsList";

// Users
import UsersList from "../pages/Users/UsersList";
import UserCreate from "../pages/Users/UserCreate";

import Reports from "../pages/Reports/Reports";

// Super Admin Reports
import SuperAdminReportsHome from "../pages/SuperAdminReports/SuperAdminReportsHome";
import VendorReport from "../pages/SuperAdminReports/VendorReport";
import POReport from "../pages/SuperAdminReports/POReport";
import InvoiceReport from "../pages/SuperAdminReports/InvoiceReport";
import PaymentReport from "../pages/SuperAdminReports/PaymentReport";
import AuditLogsList from "../pages/SuperAdminReports/AuditLogsList";

import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { getDashboardPathForRole } from "../config/roleDashboard";

import Forbidden from "../pages/Forbidden/Forbidden";

// Auth
import Login from "../pages/Auth/Login";
import ActivateAccount from "../pages/Auth/ActivateAccount";
import ChangeTemporaryPassword from "../pages/Auth/ChangeTemporaryPassword";

const RootRedirect = () => {
  const { user, isAuthenticated, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return <Navigate to={isAuthenticated && user ? getDashboardPathForRole(user.role) : "/login"} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/activate-account" element={<ActivateAccount />} />
      <Route path="/change-temporary-password" element={<ChangeTemporaryPassword />} />

      {/* Root Redirect */}
      <Route path="/" element={<RootRedirect />} />

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
        <Route path="/vendors/:id/edit" element={<AddVendor />} />
        <Route path="/finance-head/vendors" element={<VendorList />} />
        <Route path="/finance-head/vendor-reviews" element={<Navigate to="/finance-head/vendors" replace />} />
        <Route path="/finance-head/vendors/:vendorId/review" element={<FinanceHeadVendorReview />} />

        {/* Purchase Orders */}
        <Route path="/purchase-orders" element={<PurchaseOrderList />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderCreate />} />
        <Route path="/purchase-orders/create" element={<PurchaseOrderCreate />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetails />} />
        <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderCreate />} />

        {/* Invoices */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/new" element={<InvoiceCreate />} />
        <Route path="/invoices/create" element={<InvoiceCreate />} />
        <Route path="/invoices/:id" element={<InvoiceDetails />} />
        <Route path="/invoices/:id/edit" element={<InvoiceCreate />} />
        <Route path="/invoices/:id/preview" element={<InvoiceDetails />} />
        <Route path="/finance-head/invoice-approvals" element={<Navigate to="/403" replace />} />

        {/* Three-Way Matching */}
        <Route path="/three-way-matching" element={<MatchingList />} />
        <Route path="/three-way-matching/:id" element={<MatchingDetail />} />
        <Route path="/receipt-documents" element={<ReceiptDocuments />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsList />} />

        {/* Approvals */}
        <Route path="/approvals" element={<ApprovalsList />} />
        <Route path="/payment-approvals" element={<ApprovalsList />} />
        <Route path="/payment-approvals/:id" element={<PaymentApprovalDetails />} />

        {/* Payments */}
        <Route path="/payments" element={<PaymentsList />} />
        <Route path="/payment-history" element={<PaymentsList />} />
        <Route path="/payments/new" element={<PaymentCreate />} />

        {/* Users */}
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/new" element={<UserCreate />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />

        {/* ── Super Admin Reports ──────────────────────────────────────── */}
        <Route path="/super-admin/reports" element={<SuperAdminReportsHome />} />
        <Route path="/super-admin/reports/vendors" element={<VendorReport />} />
        <Route path="/super-admin/reports/purchase-orders" element={<POReport />} />
        <Route path="/super-admin/reports/invoices" element={<InvoiceReport />} />
        <Route path="/super-admin/reports/payments" element={<PaymentReport />} />
        <Route path="/audit-logs" element={<AuditLogsList />} />
        <Route path="/finance-head/audit-logs" element={<AuditLogsList />} />
        <Route path="/super-admin/audit-logs" element={<AuditLogsList />} />
      </Route>

      {/* 403 */}
      <Route path="/403" element={<Forbidden />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
