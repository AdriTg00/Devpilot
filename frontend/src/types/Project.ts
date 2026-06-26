export interface ProjectAnalysis {
  python_files: number;
  lines: number;
  functions: number;
  classes: number;

  projectName?: string;
  projectPath?: string;
}