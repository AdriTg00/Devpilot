# Dashboard / Dashboard

## Descripción / Description

This is a dashboard application built with TypeScript for Devpilot, showcasing various functionalities such as project management, analysis, and quick actions. The dashboard includes components like the current project card, dashboard header, project actions, project selector, quick actions, recent projects, stat cards, and stats grid.

## Características / Features

- **Project Management**: The application allows users to browse through their projects, select one for analysis, and view details about it.
- **Analysis**: It provides a summary and explanation of the selected project's structure.
- **Quick Actions**: Users can perform actions like generating a stream summary, explaining the project, and viewing recent projects.
- **Stats Grid**: Displays various statistics about the selected project, such as total files, lines of code, functions, classes, and by file extension.

## Arquitectura / Architecture

The application is built using React and TypeScript. It uses context providers for managing state and language translations across different components. The backend services handle data fetching and analysis.

## Instalación / Installation

1. Clone the repository from GitHub:
   ```sh
   git clone https://github.com/devpilot/Devpilot.git
   ```

2. Install dependencies:
   ```sh
   cd Devpilot/frontend
   npm install
   ```

3. Start the development server:
   ```sh
   npm start
   ```

## Uso / Usage

- Open a web browser and navigate to `http://localhost:3000` to view the dashboard.
- Log in with your credentials and browse through the projects available.
- Select a project for analysis, view its summary and explanation, and perform quick actions as needed.

## API / API

The application exposes RESTful APIs using Express.js. The following endpoints are available:

- `/api/project/analyze`: Generates a stream summary of the selected project's structure.
- `/api/project/explain`: Explains the selected project's structure in detail.
- `/api/recent/projects`: Retrieves a list of recent projects.

## Tecnologías / Technologies

- **React**: The primary framework for building the user interface.
- **TypeScript**: For type-safe code and improved development experience.
- **Express.js**: A web application framework for Node.js.
- **MongoDB**: Used for storing project data.
- **PostgreSQL**: Used for database management.

## Mejoras Futuras / Future Improvements

1. **Improved User Interface**: Enhance the user interface with modern design elements and animations.
2. **Error Handling**: Implement better error handling mechanisms to provide users with more informative feedback.
3. **Performance Optimization**: Optimize the application's performance by improving data fetching, caching, and rendering.
4. **Integration with Devpilot Platform**: Integrate the dashboard with the Devpilot platform for seamless project management.

# Code of the Project

## CurrentProject.tsx

```tsx
import { useLanguage } from "../../contexts/LanguageContext";
import Card from "../ui/Card";

export default function CurrentProject() {
  const { t } = useLanguage();
  const { analysis } = useProject();

  if (!analysis)
    return null;

  return (
    <Card>

      <p className="text-sm text-slate-400">
        {t("current_project.title")}
      </p>

      <h2 className="mt-2 text-2xl font-bold">
        {analysis.projectName}
      </h2>

      <p className="mt-2 break-all text-slate-500">
        {analysis.projectPath}
      </p>

    </Card>
  );
}
```

## DashboardHeader.tsx

```tsx
import { useLanguage } from "../../contexts/LanguageContext";

export default function Dashboard() {
  const { t } = useLanguage();
  return <h1 className="text-white">{t("dashboard.title")}</h1>;
}
```

## ProjectActions.tsx

```tsx
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamSummary,
  streamExplainProject,
} from "../../services/projectService";
import Card from "../ui/Card";

export default function ProjectActions() {
  const { currentPath, analysis } = useProject();
  const { language } = useLanguage();

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [explanation, setExplanation] = useState("");

  if (!analysis || !currentPath) return null;

  function handleSummary() {
    setSummaryLoading(true);
    setSummary("");
    streamSummary(
      currentPath,
      language,
      (text) => setSummary(text),
      () => setSummaryLoading(false),
      () => {
        setSummary("Error generating summary.");
        
      }
    );
  }

  function handleExplain() {
    setExplainLoading(true);
    setExplanation("");
    streamExplainProject(
      currentPath,
      language,
      (text) => setExplanation(text),
      () => setExplainLoading(false),
      () => {
        setExplanation("Error explaining project.");
        
      }
    );
  }

  return (
    <Card>

      <h2 className="mb-6 text-xl font-semibold">
        {t("project.analyze_title")}
      </h2>

      <div className="flex gap-4">

        <input
          type="text"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          placeholder={t("project.path_placeholder")}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
        />

        <Button>
          {t("project.browse")}
        </Button>

        <Button
          onClick={analyze}
          disabled={loading}
        >
          {loading ? t("pro
```