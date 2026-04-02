import { Routes, Route, Navigate } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ActivityDetailPage from "./pages/ActivityDetailPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/activities/:stravaActivityId" element={<ActivityDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}
