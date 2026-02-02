"""Local document search tool using TF-IDF and keyword matching."""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

from research_agent.config import KNOWLEDGE_BASE_DIR, SUPPORTED_DOC_EXTENSIONS

logger = logging.getLogger(__name__)


@dataclass
class DocMatch:
    file: str
    score: float
    excerpts: list[str]


def _tokenise(text: str) -> list[str]:
    """Lowercase and split text into word tokens."""
    return re.findall(r"[a-z0-9]+", text.lower())


class DocSearchTool:
    """Searches local documents in the knowledge base using TF-IDF scoring."""

    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or KNOWLEDGE_BASE_DIR
        self._docs: dict[str, str] = {}
        self._index: dict[str, dict[str, int]] = {}  # term -> {doc: count}
        self._doc_lengths: dict[str, int] = {}
        self._loaded = False

    def _load_documents(self) -> None:
        """Load all supported documents from the knowledge base directory."""
        if self._loaded:
            return
        for ext in SUPPORTED_DOC_EXTENSIONS:
            for filepath in self.base_dir.rglob(f"*{ext}"):
                # skip anything inside .git or research_agent dirs
                parts = filepath.relative_to(self.base_dir).parts
                if any(p.startswith(".") or p == "research_agent" for p in parts):
                    continue
                try:
                    content = filepath.read_text(errors="replace")
                    rel = str(filepath.relative_to(self.base_dir))
                    self._docs[rel] = content
                except Exception as exc:
                    logger.warning("Skipping %s: %s", filepath, exc)

        # Build inverted index
        for doc_name, content in self._docs.items():
            tokens = _tokenise(content)
            self._doc_lengths[doc_name] = len(tokens)
            term_freq: dict[str, int] = {}
            for tok in tokens:
                term_freq[tok] = term_freq.get(tok, 0) + 1
            for term, count in term_freq.items():
                self._index.setdefault(term, {})[doc_name] = count

        self._loaded = True
        logger.info("Loaded %d documents into search index", len(self._docs))

    def search(self, query: str, top_k: int = 5) -> list[DocMatch]:
        """Search documents using BM25-style scoring."""
        self._load_documents()
        query_tokens = _tokenise(query)
        if not query_tokens:
            return []

        n_docs = len(self._docs)
        if n_docs == 0:
            return []

        avg_dl = sum(self._doc_lengths.values()) / n_docs
        k1, b = 1.5, 0.75
        scores: dict[str, float] = {}

        for term in query_tokens:
            posting = self._index.get(term, {})
            if not posting:
                continue
            df = len(posting)
            idf = math.log((n_docs - df + 0.5) / (df + 0.5) + 1.0)
            for doc_name, tf in posting.items():
                dl = self._doc_lengths[doc_name]
                numerator = tf * (k1 + 1)
                denominator = tf + k1 * (1 - b + b * dl / avg_dl)
                scores[doc_name] = scores.get(doc_name, 0.0) + idf * numerator / denominator

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

        results: list[DocMatch] = []
        for doc_name, score in ranked:
            excerpts = self._extract_excerpts(doc_name, query_tokens, max_excerpts=3)
            results.append(DocMatch(file=doc_name, score=round(score, 3), excerpts=excerpts))

        return results

    def _extract_excerpts(
        self, doc_name: str, query_tokens: list[str], max_excerpts: int = 3
    ) -> list[str]:
        """Extract relevant text excerpts containing query terms."""
        content = self._docs.get(doc_name, "")
        lines = content.split("\n")
        scored_lines: list[tuple[float, int, str]] = []

        for idx, line in enumerate(lines):
            line_lower = line.lower()
            hits = sum(1 for t in query_tokens if t in line_lower)
            if hits > 0:
                scored_lines.append((hits, idx, line.strip()))

        scored_lines.sort(key=lambda x: x[0], reverse=True)
        excerpts: list[str] = []
        for _, idx, line in scored_lines[:max_excerpts]:
            # include surrounding context (1 line before / after)
            start = max(0, idx - 1)
            end = min(len(lines), idx + 2)
            snippet = "\n".join(l.strip() for l in lines[start:end] if l.strip())
            if snippet and snippet not in excerpts:
                excerpts.append(snippet)

        return excerpts

    def list_documents(self) -> list[str]:
        """Return list of available document filenames."""
        self._load_documents()
        return sorted(self._docs.keys())

    def get_document(self, name: str) -> str | None:
        """Return full text of a specific document."""
        self._load_documents()
        return self._docs.get(name)
