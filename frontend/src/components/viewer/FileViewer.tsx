import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import TypingEffect from "../ui/TypingEffect";

export default function FileViewer() {
  const { t } = useLanguage();
  const {
    selectedFile,
    fileContent,
    fileExplanation,
    explainSelectedFile,
    explaining,
  } = useProject();

  if (!selectedFile) {
    return (
      <Card>
        <h2 className="mb-6 text-xl font-semibold">
          {t("viewer.title")}
        </h2>

        <p className="text-slate-400">
          {t("viewer.select")}
        </p>
      </Card>
    );
  }

  return (
    <Card>

      <div className="mb-6 flex items-center justify-between">

        <h2 className="text-xl font-semibold">
          {selectedFile.name}
        </h2>

        <button
          onClick={explainSelectedFile}
          disabled={explaining}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {explaining ? t("viewer.generating") : t("viewer.explain")}
        </button>

      </div>

      <div className="grid grid-cols-2 gap-4">

        <div className="flex min-h-0 flex-col">
          <h3 className="mb-3 text-lg font-semibold">{t("viewer.code")}</h3>
          <div className="max-h-[600px] flex-1 overflow-auto rounded-lg bg-slate-950 p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-slate-200">
              {fileContent}
            </pre>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("viewer.ai")}</h3>
            {explaining && (
              <span className="text-sm text-slate-400">
                {fileExplanation.length} {t("viewer.chars")}
              </span>
            )}
          </div>

          <div className="max-h-[600px] flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-4">
            {fileExplanation || explaining ? (
              <TypingEffect text={fileExplanation} loading={explaining} />
            ) : (
              <p className="text-slate-400">{t("viewer.no_explanation")}</p>
            )}
          </div>
        </div>

      </div>

    </Card>
  );
}