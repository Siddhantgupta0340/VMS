# TODO - Dashboard module completion (VMS)

## Step 1: Backend enhancements (no new endpoints)
- [x] Inspect current dashboard repository/service response shapes
- [ ] Update dashboard backend aggregates for KPIs/charts/tables per role (no new endpoints)
- [ ] Update dashboard frontend to match role-specific spec (cards/graphs/tables/actions)



- [ ] Add missing aggregated datasets required by KPIs/graphs/tables for each role
- [ ] Ensure strict role scoping (Case Manager creator scope, approval-user scope, Finance head scope)
- [ ] Provide graph-ready datasets (month trends + status distributions)
- [ ] Provide latest records lists for vendors/POs/invoices and role-specific queues

## Step 2: Frontend dashboard overhaul (no new pages)
- [ ] Replace/extend `DashboardOverview.jsx` to render full role-specific UI
- [ ] Remove dummy chart data; make chart components data-driven from API
- [ ] Render KPI cards per spec for each role
- [ ] Render graphs per spec for each role
- [ ] Render Recent Activity (already exists) and Latest tables (wire to API)
- [ ] Implement Quick Actions (navigate to existing create pages; hook handlers)
- [ ] Add loading/error/empty states per widget/section

## Step 3: Verification
- [ ] Verify Super Admin dashboard
- [ ] Verify Case Manager dashboard
- [ ] Verify Team Lead dashboard
- [ ] Verify Manager dashboard
- [ ] Verify Finance Head dashboard

