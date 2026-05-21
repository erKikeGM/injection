# AI Ethical Immune Layer

This workspace contains two linked deliverables:

- `paper/`: LaTeX publication draft for the AI Ethical Immune Layer runtime safety framework.
- `platform/`: Static interactive lab for severity classification, containment controls, benchmark references, and experiment planning.

Build the paper:

```bash
cd paper
make
```

Run the platform:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/platform/`.
