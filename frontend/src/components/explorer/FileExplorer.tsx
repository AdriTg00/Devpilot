import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import FileTree from "./FileTree";

export default function FileExplorer() {
  const { t } = useLanguage();
  const {
    files,
    selectedFile,
    selectFile,
  } = useProject();

  return (
    <Card>
      <h2 className="mb-6 text-xl font-semibold">
        {t("explorer.title")}
      </h2>

      {files.length === 0 ? (
        <p className="text-slate-400">
          {t("explorer.empty")}
        </p>
      ) : (
        <FileTree files={files} selectedFile={selectedFile} selectFile={selectFile} />
      )}
    </Card>
  );
}