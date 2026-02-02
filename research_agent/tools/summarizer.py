"""Text summarization using extractive methods (no LLM required)."""

from __future__ import annotations

import re
from dataclasses import dataclass


def _sentences(text: str) -> list[str]:
    """Split text into sentences."""
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _word_freq(text: str) -> dict[str, int]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    freq: dict[str, int] = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    return freq


@dataclass
class SummarizerTool:
    """Extractive summarizer that picks the most informative sentences."""

    max_sentences: int = 5

    def summarise(self, text: str) -> str:
        """Return an extractive summary of the given text."""
        sents = _sentences(text)
        if len(sents) <= self.max_sentences:
            return text

        freq = _word_freq(text)
        if not freq:
            return text

        max_freq = max(freq.values())
        norm_freq = {w: c / max_freq for w, c in freq.items()}

        scored: list[tuple[float, int, str]] = []
        for idx, sent in enumerate(sents):
            words = re.findall(r"[a-z0-9]+", sent.lower())
            score = sum(norm_freq.get(w, 0) for w in words) / (len(words) + 1)
            scored.append((score, idx, sent))

        # pick top sentences but maintain original order
        top = sorted(scored, key=lambda x: x[0], reverse=True)[: self.max_sentences]
        top_ordered = sorted(top, key=lambda x: x[1])

        return " ".join(s for _, _, s in top_ordered)

    def extract_key_points(self, text: str, num_points: int = 5) -> list[str]:
        """Extract key bullet points from text."""
        sents = _sentences(text)
        if not sents:
            return []

        freq = _word_freq(text)
        if not freq:
            return sents[:num_points]

        max_freq = max(freq.values())
        norm_freq = {w: c / max_freq for w, c in freq.items()}

        scored = []
        for sent in sents:
            words = re.findall(r"[a-z0-9]+", sent.lower())
            score = sum(norm_freq.get(w, 0) for w in words) / (len(words) + 1)
            scored.append((score, sent))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored[:num_points]]
