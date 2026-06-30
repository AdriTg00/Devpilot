from pydantic import BaseModel, Field


class Settings(BaseModel):
    provider: str = Field(default="auto", description="LLM provider: ollama, groq, openai, anthropic, google, or auto")
    provider_model: str = Field(default="fast", description="Model preset for openai/anthropic/google: fast, balanced, code")
    ollama_model: str = Field(default="qwen2.5-coder:7b", description="Ollama model name")
    groq_model: str = Field(default="fast", description="Groq model preset: fast, balanced, or code")
    temperature: float = Field(default=0.2, ge=0.0, le=2.0, description="LLM temperature")
    max_tokens: int = Field(default=4096, ge=64, le=128_000, description="Max tokens per response")
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama server URL")
    rag_chunk_lines: int = Field(default=50, ge=10, le=500, description="Lines per RAG chunk")
    rag_overlap_lines: int = Field(default=5, ge=0, le=100, description="Overlap lines between RAG chunks")
    rag_max_chunks_per_file: int = Field(default=20, ge=1, le=200, description="Max chunks per file for RAG")
    rag_max_results: int = Field(default=8, ge=1, le=50, description="Max RAG search results")
    openai_api_key: str = Field(default="", description="OpenAI API key")
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    google_api_key: str = Field(default="", description="Google/Gemini API key")
    groq_api_key: str = Field(default="", description="Groq API key")
