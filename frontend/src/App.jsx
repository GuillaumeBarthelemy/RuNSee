import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import ActivityDetailPage from "./pages/ActivityDetailPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/activities/:stravaActivityId" element={<ActivityDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
