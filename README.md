
# AutoOps Pro

An AI-assisted operations monitoring platform that detects anomalies, identifies root causes, and recommends remediation actions across simulated infrastructure — with every decision backed by explainable, weighted scoring rather than a black-box output.

🔗 **Live Demo:** [link] &nbsp;|&nbsp; 🎥 **Video Walkthrough:** [link]

---

## Why This Project

Traditional monitoring dashboards show *what* is happening. AutoOps Pro is built to answer *why* it's happening and *what to do about it* — using a hybrid of interpretable rules and machine learning, so every alert and recommendation comes with a traceable explanation instead of a mystery score.

---

## Core Features

### 🔍 Hybrid Anomaly Detection
- Combines a **100-tree Isolation Forest** (unsupervised) with weighted threshold rules (CPU, memory, latency, error rate)
- Fuses both signals (60% rule-based, 40% ML-based) into a single explainable anomaly score
- Critical-breach overrides trigger immediate flags regardless of the fused score

### 🧭 Root-Cause Analysis
- Computes **normalized, weighted contributions** across CPU, memory, response time, and error rate — instead of naively comparing raw metric values across incompatible units
- Selects the primary issue based on weighted contribution, with severity classification (Normal / Warning / Critical)

### 📈 Trend-Aware Monitoring
- Compares recent metric windows (older vs. newer halves) to classify system trajectory as Worsening / Stable / Improving
- Adjusts root-cause confidence and failure-time estimates based on trend direction

### 🛠️ What-If Remediation Simulator
- Models **six remediation strategies** (vertical/horizontal scaling, caching, graceful restart, memory/GC tuning, rate limiting)
- Simulates severity-scaled impact on CPU and latency before recommending an action
- Automatically selects the best-fit action based on the detected root cause

### 💾 Incident Memory
- Persists high-severity incidents to PostgreSQL with deduplication (won't re-log the same active issue repeatedly)
- Looks up similar past incidents by root-cause similarity

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Recharts, Framer Motion |
| Backend | FastAPI, Python |
| ML | scikit-learn (Isolation Forest), StandardScaler |
| Database | PostgreSQL, SQLAlchemy (optional persistence layer) |
| System Monitoring | psutil (live host metrics), custom scenario-based demo engine |

---

## Architecture

```
Metrics Generator (live psutil / demo scenarios)
        │
        ▼
  Anomaly Detector (Isolation Forest + rules, fused score)
        │
        ▼
  Root-Cause Engine (weighted, normalized contribution scoring)
        │
        ▼
  Trend Analytics (worsening / stable / improving)
        │
        ▼
  Action Selector / What-If Simulator
        │
        ▼
  Dashboard (React) + Optional PostgreSQL Incident Log
```

---

## What Makes This Technically Interesting

The root-cause engine's core design decision is to avoid the common mistake of comparing raw metric values directly — CPU percentage, memory percentage, and response-time milliseconds aren't on comparable scales. Instead, each signal's contribution is normalized and capped before weighting, so the "primary issue" selection is based on relative severity, not which number happens to be numerically largest.

The anomaly detector is deliberately hybrid rather than pure ML: rule-based thresholds guarantee the system still functions meaningfully even without a trained model loaded, while the Isolation Forest catches unusual patterns that fixed thresholds would miss entirely.

---

## Known Limitations

This is a functional prototype, not a production AIOps system:
- Remediation actions are **recommended and simulated**, not automatically executed against real infrastructure
- Live-mode metrics use host-level `psutil` data; demo-mode metrics are procedurally generated for consistent testing/demonstration
- No production-grade authentication — auth state is currently client-side only
- Backend WebSocket endpoint exists but isn't yet consumed by the frontend (dashboard uses polling)

---

## Getting Started

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## License

MIT
