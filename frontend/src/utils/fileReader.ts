export interface FileEntry {
  relativePath: string;
  file: File;
}

const TEXT_EXTS = new Set([
  ".py", ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".scss", ".less",
  ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
  ".md", ".txt", ".rst", ".tex",
  ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx",
  ".java", ".cs", ".go", ".rs", ".php", ".rb", ".swift",
  ".kt", ".kts", ".scala", ".dart",
  ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
  ".sql", ".graphql", ".gql",
  ".vue", ".svelte", ".astro",
  ".terraform", ".tf", ".tfvars",
  ".dockerfile", ".makefile",
  ".gitignore", ".env", ".env.example",
  ".svg",
]);

const MAX_FILE_SIZE = 1_000_000;
const MAX_FILES = 500;

function isTextFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (TEXT_EXTS.has(ext)) return true;
  const base = name.toLowerCase();
  return base === "dockerfile" || base === "makefile";
}

export async function readDirectoryFromHandle(
  handle: FileSystemDirectoryHandle,
  basePath = "",
  onProgress?: (filePath: string) => void,
): Promise<FileEntry[]> {
  const results: FileEntry[] = [];

  for await (const [name, entry] of handle.entries()) {
    if (results.length >= MAX_FILES) break;

    const relativePath = basePath ? `${basePath}/${name}` : name;

    if (entry.kind === "directory") {
      if (name.startsWith(".") || name === "node_modules") continue;
      results.push(...(await readDirectoryFromHandle(entry, relativePath, onProgress)));
    } else if (isTextFile(name)) {
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        if (file.size > MAX_FILE_SIZE) continue;
        onProgress?.(relativePath);
        results.push({ relativePath, file });
      } catch {
        // skip unreadable
      }
    }
  }

  return results;
}

function readEntryRecursive(
  entry: FileSystemEntry,
  basePath = "",
  onProgress?: (filePath: string) => void,
): Promise<FileEntry[]> {
  return new Promise((resolve) => {
    if (!entry.isDirectory) {
      const name = entry.name;
      if (!isTextFile(name)) return resolve([]);
      const relativePath = basePath ? `${basePath}/${name}` : name;
      (entry as FileSystemFileEntry).file(
        (file) => {
          if (file.size > MAX_FILE_SIZE) return resolve([]);
          onProgress?.(relativePath);
          resolve([{ relativePath, file }]);
        },
        () => resolve([]),
      );
      return;
    }

    const dirEntry = entry as FileSystemDirectoryEntry;
    const allEntries: FileSystemEntry[] = [];

    // Must reuse the SAME reader for batched readEntries calls
    const reader = dirEntry.createReader();

    function readBatch() {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            Promise.all(
              allEntries.slice(0, MAX_FILES).map((e) => {
                const name = e.name;
                if (name.startsWith(".") || name === "node_modules") return Promise.resolve([] as FileEntry[]);
                const relativePath = basePath ? `${basePath}/${name}` : name;
                if (e.isDirectory) {
                  return readEntryRecursive(e, relativePath, onProgress);
                }
                return new Promise<FileEntry[]>((res) => {
                  if (!isTextFile(name)) return res([]);
                  (e as FileSystemFileEntry).file(
                    (file) => {
                      if (file.size > MAX_FILE_SIZE) return res([]);
                      onProgress?.(relativePath);
                      res([{ relativePath, file }]);
                    },
                    () => res([]),
                  );
                });
              }),
            ).then((nested) => resolve(nested.flat())).catch(() => resolve([]));
          } else {
            allEntries.push(...entries);
            if (allEntries.length < MAX_FILES) {
              readBatch();
            } else {
              // hit limit
              resolve([]);
            }
          }
        },
        () => resolve([]),
      );
    }

    readBatch();
  });
}

export function readDroppedFolder(
  entry: FileSystemEntry,
  onProgress?: (filePath: string) => void,
): Promise<FileEntry[]> {
  return readEntryRecursive(entry, "", onProgress);
}

export async function entriesToRecord(entries: FileEntry[]): Promise<Record<string, string>> {
  const record: Record<string, string> = {};
  await Promise.all(
    entries.map(async (e) => {
      record[e.relativePath] = await e.file.text();
    }),
  );
  return record;
}
