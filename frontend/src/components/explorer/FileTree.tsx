import { useState } from "react";
import type { ProjectFile } from "../../types/Files";

interface TreeNode {
  name: string;
  path: string;
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
                ? "bg-emerald-600 text-white"
                : "hover:bg-slate-800 text-slate-300"
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

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];

      if (isLast) {
        current.push({ name, path: file.path, children: [], isFile: true });
      } else {
        let dir = current.find((n) => !n.isFile && n.name === name);
        if (!dir) {
          dir = { name, path: parts.slice(0, i + 1).join("/"), children: [], isFile: false };
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
}

export default function FileTree({ files, selectedFile, selectFile }: FileTreeProps) {
  const tree = buildTree(files);
  return (
    <div className="flex flex-col gap-0.5 max-h-[500px] overflow-y-auto">
      <FileNode nodes={tree} selectedFile={selectedFile} selectFile={selectFile} />
    </div>
  );
}
