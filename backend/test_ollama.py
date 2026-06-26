import ollama

response = ollama.chat(
    model="qwen2.5-coder:7b",
    messages=[{"role": "user", "content": "Di únicamente la palabra Hola."}],
    stream=False,
)

print(response["message"]["content"])
