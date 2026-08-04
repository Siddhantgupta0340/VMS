import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AUTH_STATUS, useAuth } from "../../context/AuthContext";
import { canAccessPath } from "../../config/permissions";

import LoadingSpinner from "../common/LoadingSpinner";

const ProtectedRoute = ({ children }) => {
  const {
    user,
    status,
    isAuthenticated,
    bootstrapping,
  } = useAuth();

  const location = useLocation();

  if (status === AUTH_STATUS.INITIALIZING || bootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Checking session..." />
      </div>
    );
  }

  if (status === AUTH_STATUS.UNAUTHENTICATED || !isAuthenticated || !user) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
        state={{ from: { pathname: `${location.pathname}${location.search}${location.hash}` } }}
        replace
      />
    );
  }

  if (!canAccessPath(user, location.pathname)) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
