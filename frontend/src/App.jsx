import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PageLoadingState from "./components/PageLoadingState.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RunSeeDataProvider } from "./context/RunSeeDataContext.jsx";
import useAuth from "./hooks/useAuth.js";
import AppLayout from "./layouts/AppLayout.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const PerformancePage = lazy(() => import("./pages/PerformancePage.jsx"));
const ActivitiesPage = lazy(() => import("./pages/ActivitiesPage.jsx"));
const ActivityDetailPage = lazy(() => import("./pages/ActivityDetailPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const GlossairePage = lazy(() => import("./pages/GlossairePage.jsx"));
const VisualsPreviewPage = lazy(() => import("./pages/VisualsPreviewPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));

function PageRoute({ children }) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      {children}
    </Suspense>
  );
}

function getSafeNextPath(location) {
  const searchParams = new URLSearchParams(location.search);
  const nextPath = String(searchParams.get("next") || "").trim();

  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  return nextPath;
}

function RequireAuth({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isReady } = useAuth();

  if (!isReady || isLoading) {
    return <PageLoadingState />;
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return children;
}

function GuestOnlyRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isReady } = useAuth();

  if (!isReady || isLoading) {
    return <PageLoadingState />;
  }

  if (isAuthenticated) {
    return <Navigate to={getSafeNextPath(location)} replace />;
  }

  return children;
}

function AuthenticatedAppLayout() {
  return (
    <RequireAuth>
      <RunSeeDataProvider>
        <AppLayout />
      </RunSeeDataProvider>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={(
            <GuestOnlyRoute>
              <PageRoute>
                <LoginPage />
              </PageRoute>
            </GuestOnlyRoute>
          )}
        />
        <Route path="/" element={<AuthenticatedAppLayout />}>
          <Route
            index
            element={(
              <PageRoute>
                <DashboardPage />
              </PageRoute>
            )}
          />
          <Route
            path="analytics"
            element={(
              <PageRoute>
                <AnalyticsPage />
              </PageRoute>
            )}
          />
          <Route
            path="performance"
            element={(
              <PageRoute>
                <PerformancePage />
              </PageRoute>
            )}
          />
          <Route
            path="activities"
            element={(
              <PageRoute>
                <ActivitiesPage />
              </PageRoute>
            )}
          />
          <Route
            path="activities/:stravaActivityId"
            element={(
              <PageRoute>
                <ActivityDetailPage />
              </PageRoute>
            )}
          />
          <Route
            path="admin"
            element={(
              <PageRoute>
                <AdminPage />
              </PageRoute>
            )}
          />
          <Route
            path="glossaire"
            element={(
              <PageRoute>
                <GlossairePage />
              </PageRoute>
            )}
          />
          <Route
            path="visuals-preview"
            element={(
              <PageRoute>
                <VisualsPreviewPage />
              </PageRoute>
            )}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
