def analyze_python_file(content: str):

    return {
        "lines": len(content.splitlines()),
        "functions": content.count("def "),
        "classes": content.count("class ")
    }