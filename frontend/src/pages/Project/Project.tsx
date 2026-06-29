import { motion } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
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
          className="space-y-8"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <CurrentProject />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatsGrid />
          </motion.div>
          <motion.div variants={fadeUp}>
            <ProjectActions />
          </motion.div>
          <motion.div variants={fadeUp}>
            <RAGStatus />
          </motion.div>
          <motion.div variants={fadeUp}>
            <CodeReview />
          </motion.div>
        </motion.div>
      )}
      {!analysis && (
        <motion.div
          className="space-y-8"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <RecentProjects />
          </motion.div>
        </motion.div>
      )}
      <motion.div variants={fadeUp}>
        <FileExplorer />
      </motion.div>
      <motion.div variants={fadeUp}>
        <FileViewer />
      </motion.div>
    </motion.div>
  );
}