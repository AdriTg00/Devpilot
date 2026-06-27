import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("docker", docker);
SyntaxHighlighter.registerLanguage("sql", sql);

const extToLang: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  cpp: "cpp",
  c: "cpp",
  h: "cpp",
  hpp: "cpp",
  cs: "csharp",
  css: "css",
  scss: "scss",
  less: "css",
  json: "json",
  xml: "markup",
  html: "markup",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  ps1: "powershell",
  sql: "sql",
  graphql: "graphql",
  dockerfile: "docker",
  diff: "diff",
  dockerignore: "ignore",
  gitignore: "ignore",
  env: "ini",
  lock: "json",
};

import Card from "../ui/Card";
import Spinner from "../ui/Spinner";
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
    fileLoading,
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
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {explaining && <Spinner size="sm" />}
          {explaining ? t("viewer.generating") : t("viewer.explain")}
        </button>

      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="flex min-h-0 flex-col">
          <h3 className="mb-3 text-lg font-semibold">{t("viewer.code")}</h3>
          <div className="max-h-[600px] flex-1 overflow-auto rounded-lg bg-slate-950 p-4">
            {fileLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="lg" className="text-emerald-500" />
              </div>
            ) : (
              <SyntaxHighlighter
                language={extToLang[selectedFile.name.split(".").pop() ?? ""] ?? "typescript"}
                style={oneDark}
                customStyle={{ margin: 0, borderRadius: 0, background: "transparent", fontSize: "0.8125rem" }}
                codeTagProps={{ style: { fontFamily: "inherit" } }}
                showLineNumbers
              >
                {fileContent}
              </SyntaxHighlighter>
            )}
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