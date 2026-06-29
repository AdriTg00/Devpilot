import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import MainLayout from "../layouts/MainLayout";
import ErrorBoundary from "../components/error/ErrorBoundary";

const SharedProject = lazy(() => import("../pages/Shared/SharedProject"));
const Chat = lazy(() => import("../pages/Chat/Chat"));
const Project = lazy(() => import("../pages/Project/Project"));
const Documentation = lazy(() => import("../pages/Documentation/Documentation"));
const Settings = lazy(() => import("../pages/Settings/Settings"));
const Health = lazy(() => import("../pages/Health/Health"));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="h-5 w-5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "shared/:token",
    element: <ErrorBoundary><Lazy><SharedProject /></Lazy></ErrorBoundary>
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/project" replace />
      },
      {
        path: "project",
        element: <ErrorBoundary><Lazy><Project /></Lazy></ErrorBoundary>
      },
      {
        path: "chat",
        element: <ErrorBoundary><Lazy><Chat /></Lazy></ErrorBoundary>
      },
      {
        path: "documentation",
        element: <ErrorBoundary><Lazy><Documentation /></Lazy></ErrorBoundary>
      },
      {
        path: "settings",
        element: <ErrorBoundary><Lazy><Settings /></Lazy></ErrorBoundary>
      },
      {
        path: "health",
        element: <ErrorBoundary><Lazy><Health /></Lazy></ErrorBoundary>
      }
    ]
  }
]);