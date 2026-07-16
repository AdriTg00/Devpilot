import { useState, useEffect, useRef, useCallback } from "react";
import Card from "../ui/Card";
import Spinner from "../ui/Spinner";

import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import {
  readDirectoryFromHandle,
  readDroppedFolder,
  entriesToRecord,
} from "../../utils/fileReader";

export default function ProjectSelector() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentPath, uploadAndAnalyze } = useProject();

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [phase, setPhase] = useState<"idle" | "reading" | "uploading">("idle");
  const [fileCount, setFileCount] = useState(0);
  const [folderName, setFolderName] = useState("");

  async function handleBrowse() {
    if (!("showDirectoryPicker" in window)) {
      toast("Tu navegador no soporta selección de carpetas. Usa Chrome o Edge.", "error");
      return;
    }
    try {
      const handle = await (window as unknown as {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker();
      setFolderName(handle.name);
      setPhase("reading");
      const entries = await readDirectoryFromHandle(handle, "", () => {
        setFileCount((c) => c + 1);
      });
      if (entries.length === 0) {
        toast("No se encontraron archivos de código en la carpeta", "error");
        setPhase("idle");
        return;
      }
      setFileCount(entries.length);
      setPhase("uploading");
      const record = await entriesToRecord(entries);
      await uploadAndAnalyze(handle.name, record);
      setPhase("idle");
    } catch {
      if (phase !== "idle") {
        toast("Error al leer la carpeta", "error");
        setPhase("idle");
      }
    }
  }

  const handleBrowseRef = useRef(handleBrowse);
  useEffect(() => {
    handleBrowseRef.current = handleBrowse;
  });

  useEffect(() => {
    const handler = () => handleBrowseRef.current();
    window.addEventListener("devpilot:open-project", handler);
    return () => window.removeEventListener("devpilot:open-project", handler);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const items = e.dataTransfer.items;
    if (!items) return;

    // Check for directory entries first
    for (const item of Array.from(items)) {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry?.isDirectory) {
        const name = entry.name;
        setFolderName(name);
        setPhase("reading");
        try {
          const entries = await readDroppedFolder(entry, () => {
            setFileCount((c) => c + 1);
          });
          if (entries.length === 0) {
            toast("No se encontraron archivos de código en la carpeta", "error");
            setPhase("idle");
            return;
          }
          setFileCount(entries.length);
          setPhase("uploading");
          const record = await entriesToRecord(entries);
          await uploadAndAnalyze(name, record);
          setPhase("idle");
        } catch {
          toast("Error al leer la carpeta", "error");
          setPhase("idle");
        }
        return;
      }
    }

    // Fallback: single files
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const record: Record<string, string> = {};
      for (const file of files) {
        record[file.name] = await file.text();
      }
      await uploadAndAnalyze("dropped-files", record);
    }
  }

  const busy = phase !== "idle";

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center rounded-[6px] border-2 border-dashed"
          style={{
            borderColor: "var(--text-accent)",
            backgroundColor: "var(--glow-color)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: "var(--text-accent)" }}>
              Drop your project folder here
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Supports any code project
            </p>
          </div>
        </div>
      )}

      <Card>
        <h2 className="mb-6 text-xl font-semibold">
          {t("project.analyze_title")}
        </h2>

        <div
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-300 ${
            busy
              ? "border-emerald-900/30"
              : "border-emerald-900/20 hover:border-emerald-700/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.04)]"
          }`}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p className="text-sm text-slate-400">
                {phase === "reading"
                  ? `Leyendo archivos de ${folderName}...`
                  : `Subiendo y analizando ${folderName} (${fileCount} archivos)...`}
              </p>
              <p className="text-xs text-slate-500">
                {phase === "reading"
                  ? `${fileCount} archivos encontrados`
                  : "Procesando en el servidor..."}
              </p>
            </div>
          ) : (
            <>
              <svg
                className="mb-4 h-12 w-12 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>

              <p className="mb-1 text-center text-sm text-slate-400">
                Arrastra una carpeta aquí
              </p>

              <div className="mb-4 flex items-center gap-3 text-xs text-slate-600">
                <span className="h-px w-16 bg-emerald-900/30" />
                <span>o</span>
                <span className="h-px w-16 bg-emerald-900/30" />
              </div>

              <button
                onClick={handleBrowse}
                className="rounded-[6px] border border-emerald-900/30 bg-slate-800/40 px-5 py-2 text-sm text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:bg-slate-700/40 hover:shadow-[0_0_12px_rgba(34,197,94,0.06)]"
              >
                Seleccionar carpeta
              </button>

              <p className="mt-4 text-xs text-slate-600">
                Solo archivos de código con extensión reconocida (py, ts, js, go, rs, java, cpp, ...)
              </p>
            </>
          )}
        </div>

        {currentPath && (
          <p className="mt-3 text-xs text-slate-600">
            Proyecto actual: <span className="font-mono text-slate-400">{currentPath}</span>
          </p>
        )}
      </Card>
    </div>
  );
}
