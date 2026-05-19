---
id: attention
title: Attention Mechanism
tags: [transformer, neural-network, architecture]
related: [transformer, qkv]
---

# Attention Mechanism

Attention is a mechanism that allows a neural network to focus on different parts of an input sequence when producing each part of the output. Introduced for translation tasks (Bahdanau et al. 2014), it became the foundation of the Transformer architecture.

The scaled dot-product attention computes:

Attention(Q, K, V) = softmax(QK^T / √d_k) V

where Q (queries), K (keys), V (values) are learned linear projections of the input. The softmax allocates a probability mass across positions; this is the "weighting" that defines attention.

## Key properties
- O(n²) compute and memory in sequence length
- Position-invariant (positional encodings restore order)
- Parallelisable (unlike RNNs)

## Variants
- Multi-head attention: multiple independent attention computations in parallel
- Sparse attention: limit each position's attention to a subset (sliding window, etc.)
- Flash attention: kernel-optimised exact attention with reduced memory
