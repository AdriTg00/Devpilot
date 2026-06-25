from app.tools.directory_reader import list_files
from app.tools.file_reader import read_file
from app.tools.code_analyzer import analyze_python_file
from app.services.llm_service import LLMService


class ProjectService:

    def __init__(self):
        self.llm = LLMService()

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

    def summarize_project(self, path):

        stats = self.analyze_project(path)

        return self.llm.summarize_project(stats)