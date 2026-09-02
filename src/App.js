import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./utils/Toast";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AdminRoute, EmployeeRoute, GuestRoute } from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import AssetDetails from "./pages/AssetDetails";
import FileCenter from "./pages/FileCenter";
import MyFiles from "./pages/MyFiles";
import Employees from "./pages/Employees";
import AdminAssetRequests from "./pages/AdminAssetRequests";
import NetworkCredentials from "./pages/NetworkCredentials";
import ServiceBilling from "./pages/ServiceBilling";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import EmailLogs from "./pages/EmailLogs";
import ActivityLog from "./pages/ActivityLog";
import SendAssetEmail from "./pages/SendAssetEmail";
import AssetEmailLogs from "./pages/AssetEmailLogs";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import { EmployeeAssets, EmployeeProfile, EmployeeRequest, EmployeePassword } from "./pages/EmployeePages";
import Maintenance from "./pages/Maintenance";
import HaodaPulse from "./pages/HaodaPulse";
import AiSearch from "./pages/AiSearch";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Guest */}
              <Route path="/" element={<GuestRoute><Login /></GuestRoute>} />

              {/* Admin Routes */}
              <Route path="/dashboard"     element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/assets"        element={<AdminRoute><Assets /></AdminRoute>} />
              <Route path="/assets/:assetId" element={<AdminRoute><AssetDetails /></AdminRoute>} />
              <Route path="/filecenter"    element={<AdminRoute><FileCenter /></AdminRoute>} />
              <Route path="/employees"     element={<AdminRoute><Employees /></AdminRoute>} />
              <Route path="/asset-requests" element={<AdminRoute><AdminAssetRequests /></AdminRoute>} />
              <Route path="/network-credentials" element={<AdminRoute><NetworkCredentials /></AdminRoute>} />
              <Route path="/service-billing" element={<AdminRoute><ServiceBilling /></AdminRoute>} />
              <Route path="/maintenance"    element={<AdminRoute><Maintenance /></AdminRoute>} />
              <Route path="/pulse"         element={<AdminRoute><HaodaPulse /></AdminRoute>} />
              <Route path="/ai-search"     element={<AdminRoute><AiSearch /></AdminRoute>} />
              <Route path="/reports"       element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="/settings"      element={<AdminRoute><Settings /></AdminRoute>} />
              <Route path="/activity-log"  element={<AdminRoute><ActivityLog /></AdminRoute>} />
              <Route path="/email-logs"    element={<AdminRoute><EmailLogs /></AdminRoute>} />
              <Route path="/send-asset-email" element={<AdminRoute><SendAssetEmail /></AdminRoute>} />
              <Route path="/asset-email-logs" element={<AdminRoute><AssetEmailLogs /></AdminRoute>} />

              {/* Employee Routes */}
              <Route path="/emp/dashboard" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
              <Route path="/emp/assets"    element={<EmployeeRoute><EmployeeAssets /></EmployeeRoute>} />
              <Route path="/emp/files"     element={<EmployeeRoute><MyFiles /></EmployeeRoute>} />
              <Route path="/emp/profile"   element={<EmployeeRoute><EmployeeProfile /></EmployeeRoute>} />
              <Route path="/emp/request"   element={<EmployeeRoute><EmployeeRequest /></EmployeeRoute>} />
              <Route path="/emp/password"  element={<EmployeeRoute><EmployeePassword /></EmployeeRoute>} />
              <Route path="/emp/ai-search" element={<EmployeeRoute><AiSearch /></EmployeeRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
