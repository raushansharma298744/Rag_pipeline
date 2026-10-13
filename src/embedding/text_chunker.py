"""Text chunking utilities for RAG pipeline."""
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class Chunk:
    """Represents a text chunk with metadata."""
    content: str
    start_idx: int
    end_idx: int
    metadata: dict = None
    chunk_id: Optional[str] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class TextChunker:
    """Split text into overlapping chunks for embedding."""
    
    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        separator: str = "\n\n"
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separator = separator
    
    def chunk_text(self, text: str, metadata: dict = None) -> List[Chunk]:
        """Split text into overlapping chunks."""
        if metadata is None:
            metadata = {}
        
        chunks = []
        start = 0
        text_len = len(text)
        
        # Ensure overlap is strictly less than chunk_size to avoid infinite loops
        overlap = min(self.chunk_overlap, max(0, self.chunk_size - 1))
        
        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            
            # Try to break at separator only if it provides meaningful progress beyond overlap
            if end < text_len:
                last_sep = text.rfind(self.separator, start, end)
                if last_sep != -1 and last_sep > start + overlap:
                    end = last_sep + len(self.separator)
            
            chunk_content = text[start:end].strip()
            if chunk_content:
                chunks.append(Chunk(
                    content=chunk_content,
                    start_idx=start,
                    end_idx=end,
                    metadata=metadata.copy()
                ))
            
            if end >= text_len:
                break
            
            # Ensure start strictly increases to avoid infinite loop
            next_start = end - overlap
            if next_start <= start:
                next_start = end
            start = next_start
        
        return chunks
    
    def chunk_documents(self, documents: List[dict]) -> List[Chunk]:
        """Chunk multiple documents."""
        all_chunks = []
        for doc in documents:
            text = doc.get("content", "")
            meta = doc.get("metadata", {})
            chunks = self.chunk_text(text, meta)
            all_chunks.extend(chunks)
        return all_chunks