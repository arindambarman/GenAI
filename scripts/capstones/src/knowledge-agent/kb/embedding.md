---
id: embedding
title: Embeddings
tags: [representation, retrieval, foundational]
related: [attention, rag]
---

# Embeddings

A dense vector representation of text (or other modalities) that captures semantic meaning. Similar inputs produce similar vectors.

## How they're trained
- **Contrastive learning**: train so that paraphrases / related items are close, unrelated items far apart
- **Distillation**: from a larger model's hidden states
- **Self-supervised**: predict missing pieces of input

## Common models (2024)
- text-embedding-3-large (OpenAI): 3072-d, strong on semantic similarity
- BGE-large-en (BAAI): open-source, strong on retrieval benchmarks
- e5-large (Microsoft): strong on multilingual and cross-domain
- Cohere embed-v3: tuned for retrieval

## Dimensions
- Smaller (256-768): cheaper storage and faster search
- Larger (1024-3072): better recall, especially on hard queries
- Quantisation can reduce storage 4-16× with small recall loss

## Use cases
- Semantic search (retrieval): find documents similar to a query
- Clustering: group related items
- Classification: features for downstream tasks
- Dedup: identify near-duplicate content

## Limitations
- One-shot encoding: embeddings don't update based on query (cross-encoders do)
- Domain shift: an embedding model trained on web text may underperform on legal/medical
- Multilingual quality varies widely across languages
