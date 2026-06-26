export interface LanguageStats {
  files: number;
  lines: number;
  functions: number;
  classes: number;
}

export interface ProjectAnalysis {
  files: number;
  lines: number;
  functions: number;
  classes: number;
  by_type: Record<string, LanguageStats>;

  projectName?: string;
  projectPath?: string;
}