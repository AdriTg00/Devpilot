from app.tools.directory_reader import list_files
from app.tools.file_reader import read_file
from app.tools.code_analyzer import analyze_python_file


class ProjectService:

    def get_files(self, path: str):
        return list_files(path)

    def analyze_project(self, path: str):

        files = list_files(path)

        python_files = 0
        total_lines = 0
        total_functions = 0
        total_classes = 0

        for file in files:

            if file.endswith(".py"):

                python_files += 1

                content = read_file(file)

                stats = analyze_python_file(content)

                total_lines += stats["lines"]
                total_functions += stats["functions"]
                total_classes += stats["classes"]

        return {
            "python_files": python_files,
            "lines": total_lines,
            "functions": total_functions,
            "classes": total_classes
        }