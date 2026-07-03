import { motion } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import CollapsibleSection from "../../components/ui/CollapsibleSection";
import ProjectSelector from "../../components/dashboard/ProjectSelector";
import CurrentProject from "../../components/dashboard/CurrentProject";
import StatsGrid from "../../components/dashboard/StatsGrid";
import ProjectActions from "../../components/dashboard/ProjectActions";
import RAGStatus from "../../components/rag/RAGStatus";
import CodeReview from "../../components/dashboard/CodeReview";
import FileExplorer from "../../components/explorer/FileExplorer";
import FileViewer from "../../components/viewer/FileViewer";
import RecentProjects from "../../components/dashboard/RecentProjects";

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export default function Project() {
  const { analysis } = useProject();
  const { t } = useLanguage();

  return (
    <motion.div
      className="space-y-8"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <ProjectSelector />
      </motion.div>
      {analysis && (
        <motion.div
          className="space-y-6"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <CollapsibleSection title={t("project.overview")} defaultOpen={true}>
              <CurrentProject />
            </CollapsibleSection>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CollapsibleSection title={t("project.statistics")} defaultOpen={true}>
              <StatsGrid />
            </CollapsibleSection>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CollapsibleSection title={t("project.actions")} defaultOpen={true}>
              <ProjectActions />
            </CollapsibleSection>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CollapsibleSection title={t("project.rag_index")} defaultOpen={true}>
              <RAGStatus />
            </CollapsibleSection>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CollapsibleSection title={t("project.code_review")} defaultOpen={true}>
              <CodeReview />
            </CollapsibleSection>
          </motion.div>
        </motion.div>
      )}
      {!analysis && (
        <motion.div
          className="space-y-6"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <CollapsibleSection title={t("project.recent_projects")} defaultOpen={true}>
              <RecentProjects />
            </CollapsibleSection>
          </motion.div>
        </motion.div>
      )}
      <motion.div variants={fadeUp}>
        <CollapsibleSection title={t("project.file_explorer")} defaultOpen={true}>
          <FileExplorer />
        </CollapsibleSection>
      </motion.div>
      <motion.div variants={fadeUp}>
        <CollapsibleSection title={t("project.file_viewer")} defaultOpen={true}>
          <FileViewer />
        </CollapsibleSection>
      </motion.div>
    </motion.div>
  );
}