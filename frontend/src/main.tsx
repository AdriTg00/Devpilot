import { LanguageProvider } from "./contexts/LanguageContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <ProjectProvider>
      <RouterProvider router={router} />
    </ProjectProvider>
  </LanguageProvider>,
);
