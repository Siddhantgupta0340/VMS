import DashboardOverview from "./DashboardOverview";

const FinanceDashboard = () => {
  return <DashboardOverview endpoint="/v1/dashboard/finance-head/observation" />;
};

export default FinanceDashboard;

