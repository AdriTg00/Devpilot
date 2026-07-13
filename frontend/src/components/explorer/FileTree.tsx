import { useState } from "react";
import type { ProjectFile } from "../../types/Files";

interface TreeNode {
  name: string;
  path: string;
  relPath: string;
  children: TreeNode[];
  isFile: boolean;
}

interface TreeProps {
  nodes: TreeNode[];
  selectedFile: ProjectFile | null;
  selectFile: (file: ProjectFile) => void;
  depth?: number;
}

function FileNode({ nodes, selectedFile, selectFile, depth = 0 }: TreeProps) {
  return (
    <>
      {nodes.map((node) =>
        node.isFile ? (
          <button
            key={node.path}
            onClick={() => selectFile({ path: node.path, name: node.name })}
            className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
              selectedFile?.path === node.path
                ? "bg-emerald-600/20 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.1)]"
                : "hover:bg-slate-800/40 text-slate-300"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {node.name}
          </button>
        ) : (
          <DirNode
            key={node.path}
            node={node}
            selectedFile={selectedFile}
            selectFile={selectFile}
            depth={depth}
          />
        ),
      )}
    </>
  );
}

function DirNode({
  node,
  selectedFile,
  selectFile,
  depth,
}: {
  node: TreeNode;
  selectedFile: ProjectFile | null;
  selectFile: (file: ProjectFile) => void;
  depth: number;
}) {
  const [collapsed, setCollapsed] = useState(depth > 0);

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-1 rounded-lg px-3 py-1.5 text-left text-sm text-slate-400 hover:bg-slate-800/50 transition"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="w-4 text-center">{collapsed ? "▸" : "▾"}</span>
        <span>{node.name}</span>
      </button>
      {!collapsed && (
        <FileNode
          nodes={node.children}
          selectedFile={selectedFile}
          selectFile={selectFile}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function stripRoot(path: string, root: string): string {
  const normalized = path.replace(/\\/g, "/");
  const base = root.replace(/\\/g, "/").replace(/\/+$/, "") + "/";
  return normalized.startsWith(base) ? normalized.slice(base.length) : normalized;
}

function buildTree(files: ProjectFile[], rootPath?: string): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const relPath = rootPath ? stripRoot(file.path, rootPath) : file.path.replace(/\\/g, "/");
    const parts = relPath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];

      if (isLast) {
        current.push({ name, path: file.path, relPath, children: [], isFile: true });
      } else {
        let dir = current.find((n) => !n.isFile && n.name === name);
        if (!dir) {
          dir = { name, path: "", relPath: parts.slice(0, i + 1).join("/"), children: [], isFile: false };
          current.push(dir);
        }
        current = dir.children;
      }
    }
  }

  return root;
}

interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  selectFile: (file: ProjectFile) => void;
  rootPath?: string;
}

export default function FileTree({ files, selectedFile, selectFile, rootPath }: FileTreeProps) {
  const tree = buildTree(files, rootPath);
  return (
    <div className="flex flex-col gap-0.5 max-h-[500px] overflow-y-auto">
      <FileNode nodes={tree} selectedFile={selectedFile} selectFile={selectFile} />
    </div>
  );
}
