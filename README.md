# AI Ethical Immune Layer

This workspace contains two linked deliverables:

- `paper/`: LaTeX publication draft for the AI Ethical Immune Layer runtime safety framework.
- `platform/`: Static interactive lab for severity classification, containment controls, benchmark portfolio inventory, runnable experiments, and saved-run comparison.

## One-click run

The easiest path uses Docker Desktop, so users do not need to install Node.js.

macOS/Linux:

```bash
./run-ethical-immune-layer.sh
```

Windows:

```powershell
.\EthicalImmuneLayerRunner.exe
```

The launcher starts the platform, waits for readiness, and opens:

```text
http://localhost:4173/platform/
```

Useful commands:

```bash
./run-ethical-immune-layer.sh --port 4180
./run-ethical-immune-layer.sh --logs
./run-ethical-immune-layer.sh --stop
```

The Windows launcher supports the same flags:

```powershell
.\EthicalImmuneLayerRunner.exe --port 4180
.\EthicalImmuneLayerRunner.exe --logs
.\EthicalImmuneLayerRunner.exe --stop
```

Docker Compose stores experiment run JSON in `platform/runs/`.

To rebuild the Windows executable when packaging tooling is available:

```bash
npm run package:windows-runner
```

If the executable is not available, the source launcher can be run with Node.js:

```powershell
node launchers\windows\EthicalImmuneLayerRunner.cjs
```

## Advanced local run

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
