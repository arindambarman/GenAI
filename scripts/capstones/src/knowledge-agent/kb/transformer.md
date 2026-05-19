---
id: transformer
title: Transformer Architecture
tags: [neural-network, architecture, foundational]
related: [attention, qkv, positional-encoding]
---

# Transformer Architecture

Introduced in "Attention Is All You Need" (Vaswani et al. 2017). The architecture replaces recurrence and convolution with self-attention as the primary mechanism for sequence modelling.

## Core components
1. **Self-attention layers**: each position attends to all positions in the input
2. **Feed-forward layers**: per-position MLP, identical weights across positions
3. **Layer normalisation**: stabilises training
4. **Residual connections**: enable deep networks (gradient flow)
5. **Positional encoding**: injects order information (since attention is permutation-equivariant)

## Original design (encoder-decoder)
- Encoder: 6 layers of (self-attention + FFN) on the source
- Decoder: 6 layers of (masked self-attention + cross-attention + FFN) on the target
- Used for machine translation initially

## Modern variants
- **Encoder-only**: BERT, RoBERTa (classification, embedding)
- **Decoder-only**: GPT family, Claude, Llama (generation)
- **Encoder-decoder**: T5, BART (sequence-to-sequence)

## Why it won
- Parallelisable: all positions computed simultaneously (vs RNN's sequential)
- Long-range dependencies: O(1) path between any two positions
- Scales smoothly: more data + more compute → better models

The Transformer is the foundation of nearly all modern large language models.
