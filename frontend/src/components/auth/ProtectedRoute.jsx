import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_PERMISSIONS } from "../../config/permissions";

const ProtectedRoute = ({ children }) => {
  const {
    user,
    isAuthenticated,
    bootstrapping,
  } = useAuth();

  const location = useLocation();

  // VERY IMPORTANT
  if (bootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  const allowedRoutes =
    ROLE_PERMISSIONS[user.role] || [];

  const currentPath = location.pathname;

  const hasPermission = allowedRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  if (!hasPermission) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;