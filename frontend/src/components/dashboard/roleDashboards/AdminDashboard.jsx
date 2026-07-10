import DashboardOverview from "./DashboardOverview";

const AdminDashboard = () => {
  return <DashboardOverview endpoint="/v1/dashboard/overview" />;
};

export default AdminDashboard;

