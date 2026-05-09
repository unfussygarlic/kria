// Server component — opts all dashboard routes out of static prerendering.
// Auth and client logic live in _DashboardLayoutClient.tsx.
export const dynamic = "force-dynamic";
export { default } from "./_DashboardLayoutClient";
