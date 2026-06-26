import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import Dashboard from "../pages/Dashboard/Dashboard";
import Chat from "../pages/Chat/Chat";
import Project from "../pages/Project/Project";
import Documentation from "../pages/Documentation/Documentation";
import Settings from "../pages/Settings/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: "project",
        element: <Project />
      },
      {
        path: "chat",
        element: <Chat />
      },
      {
        path: "documentation",
        element: <Documentation />
      },
      {
        path: "settings",
        element: <Settings />
      }
    ]
  }
]);