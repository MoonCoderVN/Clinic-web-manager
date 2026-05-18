// client/src/components/common/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import decodeToken from "../../utils/decodeToken";

/**
 * ProtectedRoute checks in order:
 * 1. No token        → navigate("/login")
 * 2. Token expired   → toast + navigate("/login")
 * 3. Wrong role      → navigate("/unauthorized")
 * 4. All pass        → <Outlet />
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // ── Wait for AuthContext to finish initialising ──────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  // ── 1. No token at all ───────────────────────────────────────
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 2. Token exists but expired ──────────────────────────────
  const decoded = decodeToken(token);
  if (!decoded || decoded.exp * 1000 < Date.now()) {
    toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    logout();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 3. No user in context yet (shouldn't happen, but safety net) ─
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 4. Account deactivated ───────────────────────────────────
  if (user.isActive === false) {
    toast.error("Tài khoản của bạn đã bị vô hiệu hoá");
    logout();
    return <Navigate to="/login" replace />;
  }

  // ── 5. Wrong role ────────────────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ── All checks passed ────────────────────────────────────────
  return <Outlet />;
};

export default ProtectedRoute;
