"""LLM client implementations."""
import os
from abc import ABC, abstractmethod
from typing import Generator
from dotenv import load_dotenv

load_dotenv()


class LLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Generate a completion."""
        pass

    @abstractmethod
    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        """Stream a completion token by token."""
        pass


class OpenAIClient(LLMClient):
    """OpenAI API client."""

    def __init__(
        self,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.1,
        max_tokens: int = 512,
        api_key: str = None,
    ):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    def generate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        return response.choices[0].message.content

    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content


class MockClient(LLMClient):
    """Fallback client when no LLM API key is provided."""

    def __init__(self, message: str = "LLM API key not configured. Please set GROQ_API_KEY in your .env file."):
        self.message = message

    def generate(self, prompt: str) -> str:
        return self.message

    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        yield self.message


class GroqClient(LLMClient):
    """Groq API client (OpenAI-compatible)."""

    def __init__(
        self,
        model: str = "llama-3.1-70b-versatile",
        temperature: float = 0.1,
        max_tokens: int = 512,
        api_key: str = None,
    ):
        from groq import Groq
        key = api_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise ValueError("GROQ_API_KEY is not set")
        self.client = Groq(api_key=key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    def generate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        return response.choices[0].message.content

    def generate_stream(self, prompt: str) -> Generator[str, None, None]:
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content


def get_llm_client() -> LLMClient:
    """Factory to get configured LLM client."""
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("Warning: OPENAI_API_KEY not set, falling back to MockClient")
            return MockClient("OpenAI API key not set. Please set OPENAI_API_KEY in your .env file.")
        return OpenAIClient(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.1")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "512")),
            api_key=api_key,
        )
    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("Warning: GROQ_API_KEY not set, falling back to MockClient")
            return MockClient("Groq API key not set. Please set GROQ_API_KEY in your .env file.")
        return GroqClient(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.1")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "512")),
            api_key=api_key,
        )
    if provider == "mock":
        return MockClient()
    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")