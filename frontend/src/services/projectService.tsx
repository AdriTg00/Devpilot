import { api } from "./api";
import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

export async function analyzeProject(
  path: string
): Promise<ProjectAnalysis> {
  const response = await api.post("/project/analyze", {
    path,
  });

  return response.data;
}

export async function getFiles(
  path: string
): Promise<ProjectFile[]> {

  const response = await api.post("/project/files", {
    path,
  });

  return response.data.files;
}


export async function getFileContent(path: string) {
  const response = await api.post("/project/read-file", {
    path,
  });

  return response.data;
}