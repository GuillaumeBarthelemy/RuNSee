import { Routes, Route, Navigate } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ActivitiesPage from "./pages/ActivitiesPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import ActivityDetailPage from "./pages/ActivityDetailPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/activities/:stravaActivityId" element={<ActivityDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}
