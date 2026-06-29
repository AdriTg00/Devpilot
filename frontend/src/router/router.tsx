import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import ErrorBoundary from "../components/error/ErrorBoundary";

import SharedProject from "../pages/Shared/SharedProject";
import Chat from "../pages/Chat/Chat";
import Project from "../pages/Project/Project";
import Documentation from "../pages/Documentation/Documentation";
import Settings from "../pages/Settings/Settings";
import Health from "../pages/Health/Health";

export const router = createBrowserRouter([
  {
    path: "shared/:token",
    element: <ErrorBoundary><SharedProject /></ErrorBoundary>
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
        element: <ErrorBoundary><Project /></ErrorBoundary>
      },
      {
        path: "chat",
        element: <ErrorBoundary><Chat /></ErrorBoundary>
      },
      {
        path: "documentation",
        element: <ErrorBoundary><Documentation /></ErrorBoundary>
      },
      {
        path: "settings",
        element: <ErrorBoundary><Settings /></ErrorBoundary>
      },
      {
        path: "health",
        element: <ErrorBoundary><Health /></ErrorBoundary>
      }
    ]
  }
]);
