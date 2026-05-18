// client/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";
import UnauthorizedPage from "./pages/public/UnauthorizedPage";
import ForgotPasswordPage from "./pages/public/ForgotPasswordPage";
import ResetPasswordPage from "./pages/public/ResetPasswordPage";
import NotFoundPage from "./pages/public/NotFoundPage";
import ServicesPage from "./pages/public/ServicesPage";
import DoctorsPage from "./pages/public/DoctorsPage";
import DoctorDetailPage from "./pages/public/DoctorDetailPage";

// Layouts
import PatientLayout from "./components/layout/PatientLayout";
import DoctorLayout from "./components/layout/DoctorLayout";
import AdminLayout from "./components/layout/AdminLayout";

// Guards
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicRoute from "./components/common/PublicRoute";

// Patient Pages
import PatientOverview from "./pages/patient/PatientOverview";
import PatientBookPage from "./pages/patient/PatientBookPage";
import PatientAppointmentsPage from "./pages/patient/PatientAppointmentsPage";
import PatientHistoryPage from "./pages/patient/PatientHistoryPage";
import PatientProfilePage from "./pages/patient/PatientProfilePage";
import PatientChatPage from "./pages/patient/PatientChatPage";

// Doctor Pages
import DoctorOverview from "./pages/doctor/DoctorOverview";
import DoctorAppointmentsPage from "./pages/doctor/DoctorAppointmentsPage";
import DoctorShiftsPage from "./pages/doctor/DoctorShiftsPage";
import DoctorPatientsPage from "./pages/doctor/DoctorPatientsPage";
import DoctorResultsPage from "./pages/doctor/DoctorResultsPage";
import DoctorProfilePage from "./pages/doctor/DoctorProfilePage";
import SharedSettingsPage from "./pages/shared/SharedSettingsPage";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminAppointmentsPage from "./pages/admin/AdminAppointmentsPage";
import AdminDoctorsPage from "./pages/admin/AdminDoctorsPage";
import AdminPatientsPage from "./pages/admin/AdminPatientsPage";
import AdminServicesPage from "./pages/admin/AdminServicesPage";
import AdminKnowledgePage from "./pages/admin/AdminKnowledgePage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminSchedulesPage from "./pages/admin/AdminSchedulesPage";

function App() {
  return (
    <Routes>
      {/* ── PUBLIC ROUTES ── */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      {/* Accessible to everyone (logged-in or not) */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/doctors" element={<DoctorsPage />} />
      <Route path="/doctors/:id" element={<DoctorDetailPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── PATIENT ROUTES ── */}
      <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
        <Route element={<PatientLayout />}>
          {/* /patient → redirect to dashboard */}
          <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="/patient/dashboard" element={<PatientOverview />} />
          <Route path="/patient/book" element={<PatientBookPage />} />
          <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
          <Route path="/patient/history" element={<PatientHistoryPage />} />
          <Route path="/patient/profile" element={<PatientProfilePage />} />
          <Route path="/patient/chat" element={<PatientChatPage />} />
          <Route path="/patient/settings" element={<SharedSettingsPage />} />
        </Route>
      </Route>

      {/* ── DOCTOR ROUTES ── */}
      <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
        <Route element={<DoctorLayout />}>
          {/* /doctor → redirect to dashboard */}
          <Route path="/doctor" element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="/doctor/dashboard" element={<DoctorOverview />} />
          <Route path="/doctor/schedule" element={<DoctorAppointmentsPage />} />
          <Route path="/doctor/schedule/today" element={<DoctorAppointmentsPage />} />
          <Route path="/doctor/schedule/all" element={<DoctorAppointmentsPage />} />
          <Route path="/doctor/schedules" element={<DoctorShiftsPage />} />
          <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
          <Route path="/doctor/results" element={<DoctorResultsPage />} />
          <Route path="/doctor/profile" element={<DoctorProfilePage />} />
          <Route path="/doctor/settings" element={<SharedSettingsPage />} />
        </Route>
      </Route>

      {/* ── ADMIN ROUTES ── */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<AdminLayout />}>
          {/* /admin → redirect to dashboard */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminOverview />} />
          <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
          <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
          <Route path="/admin/patients" element={<AdminPatientsPage />} />
          <Route path="/admin/services" element={<AdminServicesPage />} />
          <Route path="/admin/knowledge" element={<AdminKnowledgePage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      {/* ── 404 ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
