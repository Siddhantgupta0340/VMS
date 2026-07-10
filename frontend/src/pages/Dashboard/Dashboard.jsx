import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions";

import AdminDashboard from "../../components/dashboard/roleDashboards/AdminDashboard";
import FinanceDashboard from "../../components/dashboard/roleDashboards/FinanceDashboard";
import L1Dashboard from "../../components/dashboard/roleDashboards/L1Dashboard";
import L2Dashboard from "../../components/dashboard/roleDashboards/L2Dashboard";

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case ROLES.SUPER_ADMIN:
      return <AdminDashboard />;

    case ROLES.FINANCE_HEAD:
      return <FinanceDashboard />;

    case ROLES.CASE_MANAGER:
      // Case Manager gets the operational dashboard for now
      return <L1Dashboard />;

    case ROLES.TEAM_LEAD:
      return <L1Dashboard />;

    case ROLES.MANAGER:
      return <L2Dashboard />;

    default:
      return <AdminDashboard />;
  }
};

export default Dashboard;