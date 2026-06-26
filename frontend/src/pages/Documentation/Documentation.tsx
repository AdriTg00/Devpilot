import { useState } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamDocumentation,
  generateReadme,
} from "../../services/projectService";
import Card from "../../components/ui/Card";
import TypingEffect from "../../components/ui/TypingEffect";

export default function Documentation() {
  const { currentPath } = useProject();
  const { language, t } = useLanguage();

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
    } catch {
      setReadmeResult({ readme_path: "", already_existed: false });
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
          <div className="flex gap-4">
            <button
              onClick={handleGenerateDoc}
              disabled={docLoading}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {docLoading ? "Generating..." : "Generate Documentation"}
            </button>

            <button
              onClick={handleGenerateReadme}
              disabled={readmeLoading}
              className="rounded-lg bg-slate-700 px-6 py-3 font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              {readmeLoading ? "Generating..." : "Generate README"}
            </button>
          </div>

          {readmeResult && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold text-emerald-400">
                README generated
              </h2>
              <p className="text-sm text-slate-300">
                Path: <code className="text-emerald-400">{readmeResult.readme_path}</code>
              </p>
              <p className="text-sm text-slate-400">
                {readmeResult.already_existed
                  ? "Overwritten existing file."
                  : "Created new file."}
              </p>
            </Card>
          )}

          {(docLoading || documentation) && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Documentation</h2>
              <TypingEffect text={documentation} loading={docLoading} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
