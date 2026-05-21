# Learner Agent Report

## Summary

**Module 01: Foundations & Mental Models — Synthesis Report**

This foundational module introduces the conceptual framework necessary to understand modern AI agents. It covers four major themes:

1. **Defining Agents (Lesson 1.1)**: The module establishes a working definition of agents as autonomous systems using LLMs for reasoning, introducing the *Agency Dial* as a continuous 0-4 scale to measure agent autonomy rather than relying on binary classifications. This replaces classical binary thinking with a spectrum reflecting observability, tool use, and planning capability.

2. **Historical Lineage (Lesson 1.2)**: Three eras of agent research are traced: Symbolic Agents (1956-1990) based on formal logic and hand-coded rules; Reinforcement Learning Agents (1990-2017) using MDPs and reward signals; and modern LLM Agents (2022+) leveraging pre-trained transformers for zero-shot reasoning. Each era inherited key concepts from its predecessor (planning from symbolic, exploration/reward intuitions from RL) while abandoning explicit hand-coding in favour of learned representations.

3. **Decision Framework (Lesson 1.3)**: A five-question framework guides practitioners on when NOT to use agents, addressing a critical mistake: over-engineering simple problems. The framework considers cost, task structure, and adaptation needs to recommend pipelines, workflows, or agents.

4. **Major Paradigms (Lesson 1.4)**: Four dominant LLM agent paradigms are presented with their characteristic failure modes:
   - **ReAct**: Thought-Action-Observation loops; simple and interpretable but may loop endlessly.
   - **Reflexion**: ReAct + explicit self-critique; enables learning from failure but requires good feedback.
   - **Plan-and-Solve**: Upfront decomposition before execution; reduces token usage but creates brittle plans.
   - **CodeAct**: Direct code generation instead of tool calls; flexible but requires sandboxing.

**Key Insight**: Modern LLM agents are a fusion of three traditions: symbolic planning structure, RL decision formalism, and transformer generalization. They succeed not because they are novel, but because they combine decades of research with the representational power of large language models.

**Practical Impact**: The Agency Dial and decision framework prevent costly mistakes. Learning objectives emphasize recognizing failure modes and avoiding over-agentification of simple problems.

**Forward References**: This module sets up concepts that are elaborated in later modules:
- Mathematical foundations (MDPs/POMDPs in Module 2)
- Paradigm implementations (Sherpa v1-v5 in Module 4)
- Multi-agent extensions (orchestrator-worker topologies in Module 6)
- Business decision-making (ROI modelling in Module 11)


## Key insights
- The Agency Dial (0-4 scale) replaces binary 'is it an agent?' thinking with a spectrum. This shift from categorization to measurement is crucial for practitioners: you can often solve problems at dial level 1-2 (simple tools, predefined workflows) without investing in full agent autonomy (dial 3-4). Cost rises non-linearly with autonomy; the decision framework asks: do you need that cost?
- Modern LLM agents are a fusion of three traditions separated by decades: symbolic agent planning (1950s-1990s), reinforcement learning exploration & reward intuitions (1990s-2010s), and transformer generalization (2020s). Each era 'survived' specific concepts that proved timeless: planning, exploration, feedback loops. This explains why ReAct (Thought-Action-Observation) feels natural—it echoes 70 years of agent research.
- Each of the four major paradigms (ReAct, Reflexion, Plan-and-Solve, CodeAct) has a characteristic failure mode baked into its design. ReAct can loop endlessly; Reflexion fails silently with poor feedback; Plan-and-Solve commits to brittle plans; CodeAct generates unsafe code. Recognizing these modes early prevents expensive bugs in production. The most common mistake: choosing a paradigm based on coolness rather than failure robustness.
- The five-question framework in Lesson 1.3 exists to prevent the single most expensive mistake in agent engineering: over-agentification. Many problems that appear to need agents actually need workflows (predefined steps) or even just pipelines (sequential transforms). The framework quantifies cost-of-agency, forcing honest evaluation before committing engineering effort.
- World Bible organizations (HSBC, Helix, Acme) are not just examples—they're recurring characters throughout the course. HSBC represents high-stakes, regulated environments where explainability and audit matter more than speed. Helix represents accuracy-critical domains (cite-faithfulness). Acme represents cost-sensitive e-commerce. Learning to recognize which world you're in helps you select paradigms, evaluate failures, and design appropriately.
- The death of RPA (Robotic Process Automation) foreshadows agent adoption curves. Symbolic agents in the 1980s-2000s were oversold and underdelivered; RL agents won at games but failed at real-world tasks with sparse rewards; RPA captured non-AI automation well but died when workflows became complex. Modern LLM agents succeed because they avoid these pitfalls: they generalize without explicit programming, they don't require reward tuning, and they handle open-ended tasks. But they still fail. Understanding what survived and why builds immunity to hype.
- Reflecting on the course structure itself: Module 1 teaches you to ask the right questions (when, not how). Modules 2-3 teach you the mathematics and mechanics (how). Modules 4-7 teach you implementations (specific architectures and tools). Modules 8-10 teach you operations and safety (what breaks and how to prevent it). Modules 11-13 teach you economics and frontiers (why you'd build them, and what's next). This progression from decision-making → theory → practice → production → business is intentional.

## Statistics
- Modules processed: 1
- Concepts extracted: 29
- Relationships identified: 17
- Optimization suggestions: 10
- Learning paths recommended: 3