import DashboardHeader from "../../components/dashboard/DashboardHeader";
import ProjectSelector from "../../components/dashboard/ProjectSelector";
import StatsGrid from "../../components/dashboard/StatsGrid";
import RecentProjects from "../../components/dashboard/RecentProjects";
import FileExplorer from "../../components/explorer/FileExplorer";
import CurrentProject from "../../components/dashboard/CurrentProject";
import FileViewer from "../../components/viewer/FileViewer";
import ProjectActions from "../../components/dashboard/ProjectActions";


export default function Dashboard() {
  return (
    <div className="space-y-8">

      <DashboardHeader />

      <ProjectSelector />

      <CurrentProject />

      <StatsGrid />

      <ProjectActions />

      <FileExplorer />

      <FileViewer />

      <RecentProjects />

    </div>
  );
}
