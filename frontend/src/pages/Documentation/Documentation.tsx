import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamDocumentation,
  generateReadme,
} from "../../services/projectService";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TypingEffect from "../../components/ui/TypingEffect";
import { useToast } from "../../contexts/ToastContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Documentation() {
  const { currentPath } = useProject();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const [docLoading, setDocLoading] = useState(false);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [documentation, setDocumentation] = useState("");
  const [readmeResult, setReadmeResult] = useState<{
    readme_path: string;
    already_existed: boolean;
  } | null>(null);

  function handleGenerateDoc() {
    if (!currentPath) return;
    setDocLoading(true);
    setDocumentation("");
    streamDocumentation(
      currentPath,
      language,
      (text) => setDocumentation(text),
      () => setDocLoading(false),
      () => {
        setDocumentation("Error generating documentation.");
        setDocLoading(false);
        toast("Error al generar documentación", "error");
      },
    );
  }

  async function handleGenerateReadme() {
    if (!currentPath) return;
    setReadmeLoading(true);
    setReadmeResult(null);
    try {
      const data = await generateReadme(currentPath, language);
      setReadmeResult(data);
      toast("README generado correctamente", "success");
    } catch {
      setReadmeResult({ readme_path: "", already_existed: false });
      toast("Error al generar README", "error");
    } finally {
      setReadmeLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("doc.title")}</h1>

      {!currentPath ? (
        <p className="text-slate-400">
          Open a project from the Dashboard first.
        </p>
      ) : (
        <>
          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button onClick={handleGenerateDoc} loading={docLoading}>
              Generate Documentation
            </Button>

            <Button onClick={handleGenerateReadme} loading={readmeLoading} variant="secondary">
              Generate README
            </Button>
          </motion.div>

          <AnimatePresence mode="wait">
            {readmeResult && (
              <motion.div
                key="readme"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <h2 className="mb-2 text-lg font-semibold text-emerald-400">
                    README generated
                  </h2>
                  <p className="text-sm text-slate-300">
                    Path: <code className="text-emerald-400">{readmeResult.readme_path}</code>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {readmeResult.already_existed
                      ? "Overwritten existing file."
                      : "Created new file."}
                  </p>
                </Card>
              </motion.div>
            )}

            {(docLoading || documentation) && (
              <motion.div
                key="doc"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <h2 className="mb-4 text-lg font-semibold">Documentation</h2>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <TypingEffect text={documentation} loading={docLoading} />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
