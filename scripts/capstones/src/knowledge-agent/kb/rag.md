---
id: rag
title: RAG (Retrieval-Augmented Generation)
tags: [retrieval, llm, architecture, pattern]
related: [embedding, attention]
---

# RAG: Retrieval-Augmented Generation

A pattern where a language model is augmented with a retrieval step that fetches relevant context from a corpus before generating an answer.

## Standard RAG flow
1. **Embed query** using an embedding model
2. **Search** a vector store for top-K similar documents
3. **Compose** a prompt that includes the retrieved documents + the question
4. **Generate** an answer conditioned on the retrieved context

## Why it helps
- Adds knowledge the model wasn't trained on (private data, post-training news)
- Reduces hallucination: model has actual source material to reference
- Enables citation: each claim can be linked to a source

## Variants

**Hybrid retrieval**: combine dense (embedding) + sparse (BM25) results via reciprocal-rank fusion. Catches both semantic and exact-match relevance.

**Multi-hop RAG**: retrieve, read, formulate sub-query, retrieve again. Handles questions that require chained reasoning.

**Agentic RAG**: agent drives the retrieval loop, deciding when to retrieve, what to query, when to stop.

**Graph RAG**: pre-process the corpus into a knowledge graph; retrieve subgraphs as context.

## Failure modes
- Wrong document retrieved → wrong answer (high confidence)
- No relevant document → hallucination (if model can't refuse)
- Long retrieved context → attention dilution (Module 3)

## Production discipline
- Hybrid retrieval (dense + sparse) for robustness
- Reranker on top-K for accuracy
- Verification step: re-check that cited passages support cited claims
- Memory compaction for long agentic-RAG traces
