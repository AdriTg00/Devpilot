import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";

export default function FileExplorer() {
  const {
    files,
    selectedFile,
    selectFile,
  } = useProject();

  console.log(files);
  return (
    <Card>
      <h2 className="mb-6 text-xl font-semibold">
        Project Explorer
      </h2>

      {files.length === 0 ? (
        <p className="text-slate-400">
          Analyze a project to display its files.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">

          {files.map((file) => {
    console.log(file);

    return (
      <button
        key={file.path}
        onClick={() => selectFile(file)}
        className={`rounded-lg px-3 py-2 text-left transition ${
          selectedFile?.path === file.path
            ? "bg-emerald-600 text-white"
            : "hover:bg-slate-800 text-slate-300"
        }`}
      >
        {file.name}
      </button>
    );
  })}

        </div>
      )}
    </Card>
  );
}