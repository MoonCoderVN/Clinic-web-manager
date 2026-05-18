import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * PublicRoute is used for pages like Landing, Login, Register.
 * If a user is already authenticated, it redirects them to their respective dashboard
 * instead of letting them see the public pages.
 */
const PublicRoute = () => {
  const { user, loading } = useAuth();
  const token = localStorage.getItem("token");

  // Wait for auth to resolve
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // If already logged in, redirect to dashboard based on role
  if (token && user && user.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Otherwise, render the public page
  return <Outlet />;
};

export default PublicRoute;
