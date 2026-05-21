# AI Ethical Immune Layer Lab

This is a self-contained static prototype for exploring the paper's runtime safety framework.

It includes:

- Severity-based classification using harmful compliance, jailbreak success, over-refusal, safe completion, tool misuse, compromise signals, and severe incident flags.
- Explicit containment controls for tool shutdown, memory isolation, retrieval lock, human review, legal hold, and kill switch states.
- A measurable evaluation view with benchmark references, attack categories, and safety-utility trade-off simulation.
- A concrete minimal viable experiment sequence that compares baseline, prompt-only, layered, and adversarial conditions.

Run locally from the repository root:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/platform/
```
