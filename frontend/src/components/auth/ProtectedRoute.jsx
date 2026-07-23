import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessPath } from "../../config/permissions";

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
