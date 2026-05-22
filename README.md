# AI Ethical Immune Layer

This workspace contains two linked deliverables:

- `paper/`: LaTeX publication draft for the AI Ethical Immune Layer runtime safety framework.
- `platform/`: Static interactive lab for severity classification, containment controls, benchmark portfolio inventory, runnable experiments, and saved-run comparison.

Build the paper:

```bash
cd paper
make
```

Run the platform:

```bash
npm start
```

Open `http://localhost:4173/platform/`.

The experiment runner works immediately with the built-in Ready mock provider. It also supports OpenAI, Groq, Gemini, and custom OpenAI-compatible URLs from the UI. Typed API keys are sent to the local runner for the current request and are not stored in run artifacts.

Completed runs are saved as JSON files under `platform/runs/` and indexed in `platform/runs/db.json`. The Runs view can compare saved runs without requiring a relational schema.

The benchmark portfolio is stored as JSON at `platform/data/benchmark-portfolio.json` and served through `/api/benchmarks`.

```bash
OPENAI_API_KEY=... OPENAI_MODEL=your-model npm start
```
