import { LanguageProvider } from "./contexts/LanguageContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { ToastProvider } from "./contexts/ToastContext";
import { WelcomeProvider } from "./components/welcome/WelcomeProvider";
import ErrorBoundary from "./components/error/ErrorBoundary";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <LanguageProvider>
      <ToastProvider>
        <WelcomeProvider>
          <ProjectProvider>
            <RouterProvider router={router} />
          </ProjectProvider>
        </WelcomeProvider>
      </ToastProvider>
    </LanguageProvider>
  </ErrorBoundary>,
);
