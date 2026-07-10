import DashboardOverview from "./DashboardOverview";

const L1Dashboard = () => {
  return <DashboardOverview endpoint="/v1/dashboard/me" />;
};

export default L1Dashboard;

