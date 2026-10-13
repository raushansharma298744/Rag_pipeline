"""Prompt templates for RAG generation."""


class PromptTemplates:
    """Collection of prompt templates."""
    
    DEFAULT_RAG = """You are a helpful assistant. Answer the question based on the provided context.

Context:
{context}

Question: {query}

Answer:"""
    
    CITATION_RAG = """You are a helpful assistant. Answer the question based on the provided context. 
Cite your sources using [Source X] format.

Context:
{context}

Question: {query}

Answer (with citations):"""
    
    STRUCTURED_RAG = """You are a helpful assistant. Answer the question based on the provided context.
Provide a structured response with:
1. Direct answer
2. Supporting evidence
3. Confidence level

Context:
{context}

Question: {query}

Response:"""
    
    CHAT_RAG = """You are a helpful assistant. Use the context to answer the user's question.
If the context doesn't contain relevant information, say so.

Context:
{context}

User: {query}
Assistant:"""
    
    SUMMARIZATION_RAG = """Summarize the following context to answer the question.

Context:
{context}

Question: {query}

Summary:"""
    
    @classmethod
    def get_template(cls, name: str) -> str:
        """Get template by name."""
        templates = {
            "default": cls.DEFAULT_RAG,
            "citation": cls.CITATION_RAG,
            "structured": cls.STRUCTURED_RAG,
            "chat": cls.CHAT_RAG,
            "summarization": cls.SUMMARIZATION_RAG,
        }
        return templates.get(name, cls.DEFAULT_RAG)