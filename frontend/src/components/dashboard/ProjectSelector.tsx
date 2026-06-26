import { useRef, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";

import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ProjectSelector() {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    currentPath,
    setCurrentPath,
    analyze,
    loading,
  } = useProject();

  async function handleBrowse() {
    if ("showDirectoryPicker" in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setCurrentPath(handle.name);
      } catch {
        /* user cancelled */
      }
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const entry = e.dataTransfer.items?.[0]?.webkitGetAsEntry();
    if (entry?.isDirectory) {
      setCurrentPath(entry.name);
    }
  }

  return (
    <Card>

      <h2 className="mb-6 text-xl font-semibold">
        {t("project.analyze_title")}
      </h2>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 transition ${
          dragOver
            ? "border-emerald-500 bg-emerald-900/20"
            : "border-slate-700"
        }`}
      >
        <div className="flex gap-4">
          <Input
            ref={inputRef}
            type="text"
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            placeholder={t("project.path_placeholder")}
          />

          <Button onClick={handleBrowse}>
            {t("project.browse")}
          </Button>

          <Button
            onClick={analyze}
            disabled={loading}
          >
            {loading ? t("project.analyzing") : t("project.analyze")}
          </Button>
        </div>

        {!currentPath && (
          <p className={`mt-4 text-center text-sm ${dragOver ? "text-emerald-400" : "text-slate-500"}`}>
            Arrastra una carpeta aqui o usa el boton Browse
          </p>
        )}
      </div>

    </Card>
  );
}