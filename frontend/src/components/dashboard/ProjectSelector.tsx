import { useRef } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";

import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ProjectSelector() {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Card>

      <h2 className="mb-6 text-xl font-semibold">
        {t("project.analyze_title")}
      </h2>

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

    </Card>
  );
}