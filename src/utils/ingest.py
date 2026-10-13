"""Document ingestion utilities."""
import os
import json
import io
from pathlib import Path
from typing import List, Dict, Any, Union


SUPPORTED_EXTS = {".txt", ".md", ".json", ".jsonl", ".pdf"}


def extract_text_from_pdf(
    file_source: Union[str, Path, bytes, io.BytesIO],
    source_name: str = "document.pdf"
) -> List[Dict[str, Any]]:
    """Extract text from a PDF file page by page using pypdf.
    
    Args:
        file_source: File path, bytes, or BytesIO object.
        source_name: Name of the source file for metadata attribution.
        
    Returns:
        List of document dictionaries with 'content' and 'metadata'.
    """
    from pypdf import PdfReader
    
    if isinstance(file_source, (str, Path)):
        reader = PdfReader(str(file_source))
    elif isinstance(file_source, bytes):
        reader = PdfReader(io.BytesIO(file_source))
    else:
        reader = PdfReader(file_source)

    total_pages = len(reader.pages)
    documents = []

    for page_idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if page_text:
            documents.append({
                "content": page_text,
                "metadata": {
                    "source": source_name,
                    "page": page_idx + 1,
                    "total_pages": total_pages,
                    "type": "pdf"
                }
            })

    # If the PDF had pages but no text was extracted (e.g. scanned or empty),
    # return an informative document so users know what happened.
    if not documents and total_pages > 0:
        documents.append({
            "content": f"[PDF '{source_name}' has {total_pages} page(s), but no extractable text was found (it may be scanned/image-only).]",
            "metadata": {
                "source": source_name,
                "page": 1,
                "total_pages": total_pages,
                "type": "pdf",
                "warning": "no_text_extracted"
            }
        })

    return documents


def load_documents_from_dir(data_dir: str) -> List[Dict[str, Any]]:
    """Load all supported documents from a directory recursively."""
    documents = []
    path = Path(data_dir)
    if not path.exists():
        return documents

    for file_path in path.rglob("*"):
        suffix = file_path.suffix.lower()
        if suffix not in SUPPORTED_EXTS:
            continue
        try:
            rel_source = str(file_path.relative_to(path))
            if suffix == ".pdf":
                pdf_docs = extract_text_from_pdf(file_path, source_name=rel_source)
                documents.extend(pdf_docs)
            elif suffix == ".jsonl":
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for line in content.strip().splitlines():
                    if line.strip():
                        documents.append(json.loads(line))
            elif suffix == ".json":
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                data = json.loads(content)
                if isinstance(data, list):
                    documents.extend(data)
                else:
                    documents.append(data)
            else:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                documents.append({
                    "content": content,
                    "metadata": {"source": rel_source, "type": suffix.lstrip(".")}
                })
        except Exception as e:
            print(f"Failed to load {file_path}: {e}")
    return documents