import ast
import logging
import re

logger = logging.getLogger(__name__)


def analyze_python_file(content: str) -> dict:
    lines = len(content.splitlines())
    try:
        tree = ast.parse(content)
        functions = sum(1 for n in ast.walk(tree) if isinstance(n, ast.FunctionDef))
        classes = sum(1 for n in ast.walk(tree) if isinstance(n, ast.ClassDef))
    except SyntaxError:
        functions = content.count("def ")
        classes = content.count("class ")
    return {"lines": lines, "functions": functions, "classes": classes}


def analyze_ts_like(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\b(?:function|async\s+function)\s+\w+", content))
    functions += len(re.findall(r"(\w+)\s*[:=]\s*(?:\([^)]*\)\s*=>|[a-z]+\s*=>)", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    interfaces = len(re.findall(r"\binterface\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes, "interfaces": interfaces}


def analyze_html(content: str) -> dict:
    lines = len(content.splitlines())
    elements = len(re.findall(r"<\w+[>\s/]", content))
    return {"lines": lines, "elements": elements}


def analyze_css(content: str) -> dict:
    lines = len(content.splitlines())
    rules = len(re.findall(r"\{", content))
    classes = len(re.findall(r"\.-?[_a-zA-Z][\w-]*", content))
    return {"lines": lines, "rules": rules, "selectors": classes}


def analyze_c_cpp(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\b\w+\s+\([^)]*\)\s*\{", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    structs = len(re.findall(r"\bstruct\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes + structs}


def analyze_java(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"(?:public|private|protected|static|final|\s)+\s+\w+\s*\([^)]*\)\s*\{", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    interfaces = len(re.findall(r"\binterface\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes, "interfaces": interfaces}


def analyze_csharp(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"(?:public|private|protected|internal|static|virtual|override|async|\s)+\s+\w+\s*\([^)]*\)\s*\{", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    interfaces = len(re.findall(r"\binterface\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes, "interfaces": interfaces}


def analyze_go(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bfunc\s+\w+", content))
    types = len(re.findall(r"\btype\s+\w+\s+struct", content))
    interfaces = len(re.findall(r"\btype\s+\w+\s+interface", content))
    return {"lines": lines, "functions": functions, "classes": types + interfaces}


def analyze_rust(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bfn\s+\w+", content))
    structs = len(re.findall(r"\bstruct\s+\w+", content))
    traits = len(re.findall(r"\btrait\s+\w+", content))
    impls = len(re.findall(r"\bimpl\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": structs + traits + impls}


def analyze_php(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bfunction\s+\w+", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    interfaces = len(re.findall(r"\binterface\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes, "interfaces": interfaces}


def analyze_ruby(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bdef\s+\w+", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    modules = len(re.findall(r"\bmodule\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes + modules}


def analyze_swift(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bfunc\s+\w+", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    structs = len(re.findall(r"\bstruct\s+\w+", content))
    enums = len(re.findall(r"\benum\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes + structs + enums}


def analyze_kotlin(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bfun\s+\w+", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    interfaces = len(re.findall(r"\binterface\s+\w+", content))
    objects = len(re.findall(r"\bobject\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes + interfaces + objects}


def analyze_scala(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\bdef\s+\w+", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    objects = len(re.findall(r"\bobject\s+\w+", content))
    traits = len(re.findall(r"\btrait\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes + objects + traits}


def analyze_dart(content: str) -> dict:
    lines = len(content.splitlines())
    functions = len(re.findall(r"\w+\s*\([^)]*\)\s*\{", content))
    classes = len(re.findall(r"\bclass\s+\w+", content))
    interfaces = len(re.findall(r"\bmixin\s+\w+|\bextends\s+\w+", content))
    return {"lines": lines, "functions": functions, "classes": classes}


_ANALYZERS = {
    ".py": analyze_python_file,
    ".ts": analyze_ts_like,
    ".tsx": analyze_ts_like,
    ".js": analyze_ts_like,
    ".jsx": analyze_ts_like,
    ".html": analyze_html,
    ".css": analyze_css,
    ".c": analyze_c_cpp,
    ".cpp": analyze_c_cpp,
    ".cc": analyze_c_cpp,
    ".cxx": analyze_c_cpp,
    ".h": analyze_c_cpp,
    ".hpp": analyze_c_cpp,
    ".hh": analyze_c_cpp,
    ".hxx": analyze_c_cpp,
    ".java": analyze_java,
    ".cs": analyze_csharp,
    ".go": analyze_go,
    ".rs": analyze_rust,
    ".php": analyze_php,
    ".rb": analyze_ruby,
    ".swift": analyze_swift,
    ".kt": analyze_kotlin,
    ".kts": analyze_kotlin,
    ".scala": analyze_scala,
    ".dart": analyze_dart,
}


def analyze_file(content: str, ext: str) -> dict:
    ext = ext.lower()
    analyzer = _ANALYZERS.get(ext)
    if analyzer:
        return analyzer(content)
    return {"lines": len(content.splitlines())}
