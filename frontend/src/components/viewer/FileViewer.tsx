import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";

export default function FileViewer() {
  const {
    selectedFile,
    fileContent,
  } = useProject();

  if (!selectedFile) {
    return (
      <Card>
        <h2 className="mb-6 text-xl font-semibold">
          File Viewer
        </h2>

        <p className="text-slate-400">
          Select a file to view its contents.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-6 text-xl font-semibold">
        {selectedFile.name}
      </h2>

      <div className="max-h-[700px] overflow-auto rounded-lg bg-slate-950 p-4">
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-200 font-mono">
          {fileContent}
        </pre>
      </div>
    </Card>
  );
}