# AutoOps Pro — College Panel Presentation and Live-Demo Guide

## How to use this guide

This guide is written from the current repository. It describes the implemented
local/demo system, not a hypothetical production platform. The safest demo
mode is the controlled **demo** telemetry mode because its scenarios are
repeatable and are designed to produce visible anomaly, diagnosis,
recommendation, incident, and recovery behavior.

Before the panel:

1. Start PostgreSQL and create/configure the database named by `DATABASE_URL`.
2. Start the backend with `./scripts/start_backend.sh` from any directory.
3. Start the frontend with `cd frontend && npm run dev`.
4. Open the frontend, sign in using the current client-side auth flow, and
   complete the initialization screen if shown.
5. Confirm that Dashboard loads, the database-backed Incidents page loads, and
   that at least one incident exists before the demonstration.

If the database is unavailable, the application intentionally shows an API
error for incident persistence rather than pretending that there are zero
incidents. Do not describe that as a successful live demo.

---

## Part 1 — Two-to-three-minute project introduction

### Natural spoken introduction

“Our project is **AutoOps Pro — an AI-Based Autonomous Operations Engineer
with Narrative Intelligence**.

The problem we address is that traditional monitoring dashboards usually show
metrics and alerts, but they do not provide a complete investigation story.
An operator may see high CPU or latency, but still has to manually determine
the likely root cause, find similar previous incidents, decide what action to
take, and estimate whether that action is safe.

AutoOps Pro connects those steps. It observes either controlled synthetic demo
telemetry or local host telemetry, detects abnormal behavior using a hybrid
Isolation Forest and explainable threshold-rule detector, analyzes likely root
cause using weighted metric contributions, generates a deterministic
recommendation, and stores high-severity incidents with evidence. The operator
can then inspect historical intelligence, service dependency impact,
recommendation reasoning, feedback, execution records, and a what-if
simulation in one investigation workflow.

The main objective is not to claim automatic production remediation. The
objective is to demonstrate an explainable operations-assistance pipeline:
from observation, to diagnosis, to decision support, to auditable
investigation.

The frontend uses React, TypeScript, Tailwind CSS, Recharts, and Vitest. The
backend uses Python, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, Alembic,
psutil, and scikit-learn. Uvicorn serves the FastAPI application and Vite
serves the frontend during development.

What makes AutoOps Pro different from a simple dashboard is the narrative and
evidence layer. A dashboard says what the current values are. AutoOps Pro also
explains which signal contributed to the diagnosis, what recommendation was
selected, what historical records are relevant, what the dependency blast
radius is, and what the projected effect of a remediation would be in a
non-destructive simulation.”

### Actual high-level architecture

```text
Demo scenario generator or live psutil metrics
                    ↓
          Shared metrics and recent history
                    ↓
   Hybrid anomaly detection: rules + Isolation Forest
                    ↓
 Weighted root-cause analysis and trend analysis
                    ↓
 Deterministic recommendation decision engine
                    ↓
 High-severity incident + evidence/telemetry snapshots in PostgreSQL
                    ↓
 Historical intelligence, service dependency impact,
 operator feedback, execution lifecycle, and timeline
                    ↓
 Non-destructive what-if simulation and unified investigation UI
```

The automatic incident write is conditional: the system records active
high/critical detections. Normal and warning analysis can still be shown in the
Dashboard and Predictions pages without creating a high-severity incident.

---

## Part 2 — Recommended live-demo order

The best order follows the operator story instead of opening pages randomly:

1. **Dashboard** — establish the current system state and select a controlled
   failure scenario.
2. **Predictions** — show the forecast, trend, evidence, and confidence
   interpretation.
3. **Incidents** — show that the high-severity condition became a persisted
   incident rather than only a transient alert.
4. **Investigation inside Incidents** — show immutable evidence, incident-time
   telemetry, timeline, recommendation reasoning, historical intelligence,
   operator feedback, and execution records.
5. **AI Simulator** — test the recorded recommendation without changing any
   infrastructure.
6. **Service Map** — explain dependency direction and blast radius.
7. **Telemetry** — finish with the local host diagnostic view and its safe
   limitations.

The route paths are `/dashboard`, `/predictions`, `/incidents`,
`/ai-simulator`, `/service-map`, and `/telemetry`.

### Step 1 — Dashboard

- **Click:** Open Dashboard. Select **Demo** if the source is not already
  demo. Select **Database overload** for a strong, coherent incident story.
  The other implemented scenarios are Normal operations, Traffic spike,
  Memory leak, and Fix applied.
- **On screen:** Current system state, anomaly status and score, incident
  statistics, CPU/memory/response-time/request/error/latency cards, recent
  telemetry history, diagnosis, recommendation, prediction evidence, and
  demo scenario controls.
- **Say:** “I am selecting a controlled database-overload scenario so the
  panel can observe the same analysis pipeline consistently. This is demo
  telemetry, and the UI labels it as synthetic rather than pretending it is a
  production service feed.”
- **Internal flow:** The frontend requests `/metrics/mode`,
  `/demo/scenarios`, `/metrics`, `/system-status`, and
  `/metrics/history?limit=24`. The backend’s metrics update loop moves shared
  values toward the selected scenario targets and keeps a bounded recent
  history.
- **Backend pieces:** `metrics_generator.py`, `system.py`,
  `anomaly_detector.py`, `root_cause.py`, `trend_analytics.py`, and
  `WhatIfSimulator._select_best_action()`.
- **Why it exists:** It provides the operational starting point and makes the
  later incident investigation understandable.
- **Panel takeaway:** The system is not only drawing charts; the current
  values feed the analysis pipeline.

### Step 2 — Predictions

- **Click:** Open **Predictions** or use the Dashboard’s “View Prediction”.
- **On screen:** Current status, anomaly flag and score, forecast text, time
  to failure, confidence, trend direction and sample size, evidence, root
  cause, similar historical incident text when available, and recommended
  response.
- **Say:** “This page is backed by the same current system-status analysis as
  the Dashboard. The failure forecast is rule-based and trend-informed; it is
  not presented as a trained probability model.”
- **Internal flow:** The page calls `GET /system-status`. That endpoint runs
  the anomaly detector, root-cause analyzer, recent-window trend analyzer,
  recommendation selector, and `_timeline()` forecast logic. It also performs
  automatic incident persistence for a high/critical diagnosis.
- **Panel takeaway:** Anomaly detection asks whether the current pattern is
  abnormal; failure prediction estimates whether the current resource state
  is critical enough to lead to failure and supplies a time window.

### Step 3 — Incidents list

- **Click:** Open **Incidents**.
- **On screen:** Open, High/Critical, Resolved, and Historical counts; search
  fields; incident records with ID, service, severity, root cause, status, and
  timestamp.
- **Say:** “The incident is now a persisted operational record. The list is
  not reconstructed from the current dashboard values.”
- **Internal flow:** The page requests `GET /incidents/all`,
  `GET /incidents/statistics`, and `GET /incidents/patterns`.
- **Backend/database:** FastAPI incident routes use SQLAlchemy sessions and
  the PostgreSQL `incidents` table.
- **Panel takeaway:** High-severity detection creates durable incident memory.

### Step 4 — Unified investigation

- **Click:** Select the newest incident. Wait for the investigation to load.
- **On screen:** Persisted summary, incident-time telemetry snapshot,
  evidence snapshot, timeline, recommendation reasoning, execution panel,
  operator feedback panel, historical intelligence, limitations, and—when the
  evidence contains a dependency service—dependency impact.
- **Say:** “This is the central investigation view. It combines facts captured
  at incident creation with deterministic historical context. It does not
  silently replace missing historical evidence with current values.”
- **Internal flow:** The page calls
  `GET /incidents/{incident_id}/investigation-summary`. If the incident’s
  evidence contains `dependency_service_id`, it also calls
  `GET /service-dependencies/{service_id}/impact`.
- **Panel takeaway:** The investigator can see the evidence, reasoning,
  history, human feedback, lifecycle records, and limitations together.

### Step 5 — Recommendation and simulator

- **Click:** In the investigation, show **Recommendation reasoning**, then
  click **Simulate recommendation** or **Test this action**.
- **On screen:** AI Simulator opens with incident context, current CPU and
  latency, selected action, projected CPU/latency, failure risk, confidence,
  root-cause context, and explanation.
- **Say:** “This is a what-if calculation. It estimates the effect of a finite
  action registry; it does not call a cloud provider, restart a process, scale
  a service, or change infrastructure.”
- **Internal flow:** The page first requests `/metrics` and `/system-status`,
  then posts to `POST /simulator/simulate` with `cpu_usage`, `latency`, the
  selected action, and context such as severity and primary issue.

### Step 6 — Service Map

- **Click:** Open **Service Map**. If an incident had a dependency service,
  use its “View service impact” button to open `/service-map?service=...`.
- **On screen:** Canonical service nodes, dependency edges, health overlay,
  selected-service impact, direct dependents, transitive dependents, depth,
  severity, and blast-radius information.
- **Say:** “The map explains propagation: a failure in a dependency can affect
  direct users and then upstream services. This topology is a static model for
  the demonstration, and its health overlay is scenario-driven.”
- **Internal flow:** The page calls `/topology`, `/service-health`, and
  `/service-dependencies/{service_id}/impact`.

### Step 7 — Telemetry

- **Click:** Open **Telemetry** and allow each card to load.
- **On screen:** System overview, network interfaces, listening ports,
  processes, and risk signals, with explicit loading, unavailable, empty, and
  limitation states where applicable.
- **Say:** “This is local host diagnostic telemetry collected through psutil.
  It is separate from the service-style demo metrics used by the anomaly
  pipeline. A safe summary is also captured at incident creation.”
- **Internal flow:** The page calls `/telemetry/system`,
  `/telemetry/network-interfaces`, `/telemetry/listening-ports`,
  `/telemetry/processes`, and `/telemetry/risk-signals`.

---

## Part 3 — Dashboard and system monitoring

### What is displayed

The Dashboard displays:

- CPU percentage
- Memory percentage
- Response time
- Request count
- Error rate
- Latency
- Current status: normal, warning, or critical
- Anomaly detected/not detected and the bounded anomaly score
- Incident counts from PostgreSQL
- Recent metric history for CPU and memory
- Root cause and primary issue
- Recommendation and reason
- Failure forecast, time-to-failure estimate, explanation, and trend
- Demo/live source provenance

### Actual metric sources and update behavior

The backend has one shared metric contract. In demo mode,
`generate_metrics()` moves values toward the selected scenario targets and
adds bounded random fluctuation. The current scenario names and targets are in
`backend/app/utils/metrics_generator.py`:

| Scenario | Service label | Purpose |
|---|---|---|
| Normal operations | payment | Healthy baseline |
| Traffic spike | api-gateway | Higher request load and gateway pressure |
| Database overload | postgres-primary | Slower payment/order path and DB pressure |
| Memory leak | auth-service | Memory growth and auth degradation |
| Fix applied | payment | Recovery toward healthy values |

The background metrics thread in `main.py` runs `update_metrics`; the update
flow sleeps for two seconds. Demo history is kept in an in-memory deque with a
maximum of 30 samples. The Dashboard requests history with a limit of 24.

In live mode, `generate_live_metrics()` uses `psutil` for CPU, memory, disk,
network I/O, disk I/O, and process count, then maps those host readings into
the existing service-style fields. `error_rate` is kept at zero in live mode
because the host collector has no trustworthy application-error equivalent.

### Service health

`health_service.py` does not discover real services. It returns deterministic
health for the active demo scenario over the canonical service graph. For
example, database stress marks `db` failed and marks auth, order, payment,
inventory, and gateway degraded according to dependency propagation. Normal
and live mode have no scenario-specific service failure and return healthy
states.

### Anomaly representation

The Dashboard receives the result from `GET /system-status`. In demo mode the
current state is evaluated directly. In live mode, Isolation Forest-only
outliers do not independently transition the displayed state; rule evidence
must persist across three collector samples before a live state changes.

### 30–60 second spoken script

“This is the operations command center. The six metric cards show the current
service-style telemetry contract. I am in demo mode, so the source is clearly
labelled synthetic. I select Database overload and allow the values to move
toward that controlled target. The backend keeps a recent metric window,
calculates a hybrid anomaly signal, selects a weighted root cause, and exposes
the recommendation and forecast in the same response. The incident counts are
separate persisted data from PostgreSQL, while the chart is recent in-memory
metric history. This distinction is important: current monitoring, historical
incident memory, and incident-time evidence are different data products.”

---

## Part 4 — Predictions and failure forecasting

### What is actually implemented

The frontend Predictions page is `/predictions`, but it does not call the
legacy `/prediction` route. It calls `GET /system-status`, which is the
integrated prediction/status endpoint used by the current UI.

`failure_prediction.py` implements `FailurePredictor.predict()` as a simple
rule-based component. It is not a trained ML failure-prediction model.

Inputs:

- `cpu`
- `memory`
- `response_time`
- `error_rate`
- `latency`, with the larger of latency and response time used for the check

Rules:

| Condition | Output |
|---|---|
| CPU ≥ 85, memory ≥ 90, effective latency ≥ 350, or error rate ≥ 5 | `will_fail: true`, confidence `0.9`, reason “Critical resource usage” |
| CPU > 60, memory > 75, effective latency > 120, or error rate > 1 | `will_fail: false`, confidence `0.65`, reason “Service degradation requires attention” |
| Otherwise | `will_fail: false`, confidence `0.9`, reason “System stable” |

The broader `system.py` forecast then combines the predictor with root-cause
severity and current effective latency. It produces a human-readable
`prediction`, `time_to_failure`, and `explainability` list. Trend direction
from the recent window adjusts confidence and, for worsening/improving
conditions, adjusts the displayed time window.

The UI explicitly labels confidence as rule-analysis confidence, not measured
model accuracy. The anomaly score is also a bounded hybrid signal, not a
calibrated probability.

### Difference between anomaly detection and failure prediction

- **Anomaly detection:** “Is this current metric pattern abnormal?” It uses
  weighted threshold evidence and, when loaded, a scikit-learn Isolation
  Forest.
- **Failure prediction:** “Given these resource thresholds, is the current
  condition critical enough to suggest an upcoming failure or degradation?”
  It is rule-based and trend-informed.

### Live action and script

Open `/predictions` after selecting Database overload on the Dashboard. Point
to the forecast, time-to-failure, confidence, and explainability bullets.

Say:

“The prediction is intentionally transparent. CPU, memory, effective latency,
and error rate are checked against explicit operational thresholds. The system
does not claim that 90 percent is a statistically calibrated probability. It
is a rule-analysis confidence value. The trend window then makes the forecast
more or less urgent based on whether recent CPU, memory, and latency are
moving together.”

### Likely viva questions

**Is failure prediction machine learning?**

No. The current failure predictor is rule-based. The project does use ML for
the separate Isolation Forest anomaly detector.

**Why not use the anomaly score as the failure probability?**

Because the anomaly score combines weighted rules and normalized Isolation
Forest output; the code documents it as a bounded signal, not a calibrated
probability. Failure forecasting uses explicit resource rules and trend
adjustment.

**Where does the frontend get the prediction?**

From `GET /system-status`. Both Dashboard and Predictions use the same
integrated response.

**Does prediction itself create an incident?**

The `/system-status` request can persist an incident when the resulting
root-cause severity is high or critical. A normal or warning response does not
automatically create a high-severity incident.

---

## Part 5 — Incident management

### Complete lifecycle

```text
Current metrics
  → anomaly and root-cause analysis
  → high/critical decision
  → evidence and local telemetry snapshot captured
  → incident row inserted into PostgreSQL
  → list/statistics/patterns retrieval
  → investigation summary and timeline
  → operator feedback, optional execution lifecycle, and resolution
```

The automatic persistence path is `_record_incident_if_needed()` in
`backend/app/routes/system.py`. It stores one active evidence-backed incident
for the same service/severity/root-cause condition instead of repeatedly
creating duplicates. A resolved incident does not suppress a later occurrence.

### Incident record

The SQLAlchemy `Incident` model maps to the PostgreSQL `incidents` table. Its
main fields are:

- `id`
- `service_name`
- `severity`
- `anomaly_type`
- `root_cause`
- `recommendation`
- `status` (`Open` or `Resolved`)
- `timestamp`
- `resolved_at`
- operator feedback fields: status, reason, time, and recorded action
- `evidence_snapshot` JSONB
- `telemetry_snapshot` JSONB

The evidence snapshot preserves the incident-time metrics, anomaly score and
reason, rule/Isolation Forest evidence, thresholds, root-cause details,
confidence, risk, recommendation, recommendation explanation, trend,
estimated failure window, and dependency service ID where available.

The safe telemetry snapshot preserves a bounded local summary. It intentionally
does not store sensitive process command lines, environment variables, remote
endpoints, or equivalent raw fields.

### Exact live actions

1. On Dashboard, choose **Database overload**.
2. Wait for the metrics to move toward the target and refresh if needed.
3. Open **Incidents**.
4. Confirm the newest high/critical incident appears.
5. Select it and point to its ID, service, severity, root cause, status, and
   captured timestamp.
6. In the evidence section, point to the metric values and the statement that
   the hybrid score is not a probability.
7. If desired, click **Resolve incident** only after explaining that this
   changes the persisted lifecycle status and records `resolved_at`; it does
   not claim that infrastructure was remediated.

### Relevant routes

- `GET /incidents/`
- `POST /incidents/`
- `GET /incidents/all`
- `GET /incidents/history`
- `GET /incidents/statistics`
- `GET /incidents/patterns`
- `GET /incidents/search`
- `GET /incidents/{incident_id}`
- `PUT /incidents/{incident_id}`
- `POST /incidents/{incident_id}/feedback`
- `GET /incidents/{incident_id}/report`
- `GET /incidents/{incident_id}/investigation-summary`

---

## Part 6 — Service Map

### What it represents

The canonical graph in `service_graph.py` contains six services:

```text
gateway → auth → db
gateway → order → payment → db
                 └→ inventory → db
```

More precisely, the stored dependency mapping is:

- `gateway` depends on `auth` and `order`
- `auth` depends on `db`
- `order` depends on `payment` and `inventory`
- `payment` depends on `db`
- `inventory` depends on `db`
- `db` has no dependencies

The topology service converts this mapping into node and edge arrays. The
frontend renders that canonical graph and overlays the synthetic scenario
health.

### Impact analysis

When a service is selected, dependency analysis reverses the graph and uses a
breadth-first traversal. It reports direct dependents, transitive dependents,
shortest dependency paths, impact count, cascade depth, severity, and blast
radius. The cascade analysis is deterministic and does not use ML.

Impact classification is low/contained for zero affected services, medium/
limited for one, high/broad for two or three, and critical/critical for more
than three.

### Live demonstration

1. Open **Service Map**.
2. Point out that edges are directed from a service to its dependency.
3. Select `db` or use **View service impact** from an incident with a captured
   dependency ID.
4. Show that auth, payment, and inventory are direct dependents, while order
   and gateway are transitive dependents.
5. Say: “This is dependency impact analysis over a static canonical graph. It
   is useful for explaining blast radius, but it is not real service discovery
   or distributed tracing.”

Relevant routes are `GET /topology`, `GET /service-health`, and
`GET /service-dependencies/{service_id}/impact`. There is also the canonical
dependency API at `GET /dependency/topology` and
`GET /dependency/impact/{service_id}`.

---

## Part 7 — Telemetry

### Local telemetry collected

The Telemetry page displays five groups:

1. **System:** OS name/release/version, kernel, architecture, hostname, CPU
   core counts, total/available/used memory, memory percentage, uptime, boot
   time, and collection timestamp.
2. **Network interfaces:** interface state, speed, MTU, addresses, counters,
   errors, and drops.
3. **Listening ports:** TCP/UDP protocol, address family, local address, local
   port, and status.
4. **Processes:** bounded list of local processes with PID, name, status,
   user, CPU/memory percentage, RSS, thread count, and creation time.
5. **Risk signals:** explainable signals such as elevated memory, high process
   CPU, process-count pressure, and collector limitations.

The collectors use `psutil`, `platform`, `socket`, and standard time helpers.
The endpoints return Pydantic response models with extra fields forbidden.
Collector failures are handled as unavailable values or explicit API errors.

### Normal metrics versus incident telemetry snapshot

- **Normal monitoring metrics** are the shared service-style values used by the
  Dashboard, anomaly detector, trends, and prediction flow. Demo values are
  generated; live values are mapped from host readings.
- **Incident telemetry snapshot** is a safe local diagnostic summary captured
  once when an incident is created and stored as JSONB on that incident. It is
  historical evidence, not a live stream and not a reconstruction from later
  data.

### Live demonstration

1. Open **Telemetry**.
2. Start with System Overview and explain that this is the actual local host.
3. Show Network Interfaces, Listening Ports, and Processes.
4. Show Risk Signals and any collector limitations.
5. Return to the incident investigation and show the incident-time snapshot.
6. Say: “The snapshot is deliberately safer and smaller than the raw local
   collectors. It preserves investigation context without storing command
   lines, tokens, remote endpoints, or private paths.”

Routes:

- `GET /telemetry/system`
- `GET /telemetry/network-interfaces`
- `GET /telemetry/listening-ports`
- `GET /telemetry/processes`
- `GET /telemetry/risk-signals`
- Compatibility alias: `GET /telemetry/network`

---

## Part 8 — Historical intelligence

Historical intelligence is deterministic analysis of persisted incident rows;
it is not semantic search, an LLM, or a Bayesian forecast.

For the selected incident, `historical_intelligence.py`:

1. Loads the incident from PostgreSQL.
2. Excludes the incident itself.
3. Considers only incidents strictly earlier than the current incident.
4. Filters empty or whitespace-only matching values.
5. Counts previous incidents with the same service, root cause, and anomaly
   type.
6. Calculates the most frequently recorded recommendation for the root cause.
7. Calculates the most frequently affected service.
8. Returns a deterministic list of similar incidents using this priority:
   same service + same root cause, then same service + same anomaly, then same
   root cause.
9. Orders ties deterministically by timestamp descending and incident ID.

The response contains `historical_summary` and `similar_incidents`. The
recommendation frequency is only how often a recommendation was recorded; it
does not mean that the action succeeded.

### Live demonstration

1. Use an existing incident in the Incidents page.
2. Scroll to **Historical Incident Intelligence**.
3. Point to same-service, same-root-cause, same-anomaly, recurring
   recommendation, and most-affected-service values.
4. Click a listed previous incident if the UI presents one.
5. Say: “The matching is deterministic and fact-bounded. If the database is
   unavailable, the application reports that limitation; it does not invent a
   similar incident.”

The endpoint is `GET /incidents/{incident_id}/intelligence`, and the same
historical structure is included in
`GET /incidents/{incident_id}/investigation-summary`.

---

## Part 9 — Recommendation analysis

### How recommendations are generated

The decision engine is part of `WhatIfSimulator`, specifically
`_select_best_action()`. It evaluates current CPU, memory, latency, error
rate, root-cause primary issue, anomaly state, and root-cause confidence.

The candidate actions are:

- `scale_cpu` — Vertical CPU Scaling
- `scale_horizontal` — Horizontal Scaling (Add Instances)
- `reduce_latency` — Request Queue Optimization & Caching
- `restart_service` — Graceful Service Restart
- `optimize_memory` — Memory Leak Fix & GC Tuning
- `throttle_requests` — Rate Limiting & Request Throttling

The selector gives metric-pressure scores, adds a primary-issue bonus, picks
the action corresponding to the diagnosed issue when possible, derives an
action ranking signal, and maps severity to a risk label. The response also
contains candidate ranking, selection factors, evidence strings, and a reason.

Examples of scoring signals:

- CPU above 80 adds more to CPU scaling; CPU above 60 adds a smaller amount.
- Memory above 85 adds more to memory optimization; memory above 75 adds a
  smaller amount.
- Latency above 300 adds more to latency reduction; latency above 150 adds a
  smaller amount.
- Error rate above 5 adds more to restart; error rate above 1 adds a smaller
  amount.
- High CPU plus high latency adds traffic-throttling pressure.
- The diagnosed primary issue receives a matching action bonus.

The action score is a ranking signal, not a success probability or confidence
probability.

### Live demonstration

1. In an incident investigation, show **Recommendation reasoning**.
2. Point to the recommended action, action score, selection factors, candidate
   ranking, and candidate evidence.
3. Say: “This is an explainable deterministic decision engine. It records why
   this action ranked highest; it does not claim that the action was executed
   or that it will definitely succeed.”
4. Click **Accept recommendation** only if you want to demonstrate operator
   feedback. Explain that acceptance is feedback, not execution.

---

## Part 10 — What-if remediation simulator

### What it does

The AI Simulator is `/ai-simulator`. It evaluates one finite action against
current CPU and latency, plus context from the current status or selected
incident. The action registry contains six actions, with base CPU and latency
reduction factors. Severity multiplies the modeled effect. Small random
variation is added to keep the projected result from being a fixed template.

The output contains:

- selected action
- projected CPU
- projected latency
- failure risk: Low, Medium, High, or Critical
- confidence label and percentage
- severity and root-cause context
- natural-language explanation

Failure risk is calculated from projected CPU, projected latency, and severity.
Confidence is derived from action/context compatibility and the current
scenario. The simulator does not access a cloud API, process supervisor,
database server, or real service deployment.

### Exact live scenario

1. From the incident page, click **Simulate recommendation**. This passes the
   incident and recommended action in router state.
2. Confirm that the selected action matches the recorded recommendation.
3. Click **Simulate selected action**.
4. Show projected CPU and latency, failure risk, confidence, and explanation.
5. Say: “The input is the current metric contract plus diagnostic context. The
   output is a modeled what-if result. The screen explicitly says simulation
   only and no infrastructure is changed.”
6. Optionally select a different action and run it to demonstrate that the
   finite registry produces different projections.

The request is:

```text
POST /simulator/simulate
{
  "metrics": {"cpu_usage": ..., "latency": ...},
  "action": "scale_cpu",
  "context": {
    "severity": "Critical",
    "primary_issue": "High CPU",
    "root_cause": "..."
  }
}
```

The response is `{ "success": true, "data": ... }`.

---

## Part 11 — Unified investigation summary

### Why it is important

Without a unified view, an operator would need to open the incident list,
search another page for history, inspect raw evidence elsewhere, and manually
remember whether feedback or execution occurred. The investigation summary
keeps these facts together and makes absence explicit.

### Endpoint and response structure

The endpoint is:

```text
GET /incidents/{incident_id}/investigation-summary
```

The `InvestigationSummary` response contains:

- `incident`: persisted incident identity and fields, including status,
  timestamps, and evidence snapshot
- `telemetry_snapshot`: safe local snapshot captured at incident creation, or
  `null`
- `historical_intelligence`: deterministic previous-incident analysis, or a
  fact-bounded empty/limited result
- `recommendation_explanation`: recorded action, reason, ranking signal,
  candidate actions, and selection factors, or `null` for legacy records
- `operator_feedback`: accepted/rejected feedback, reason, action, and time,
  or `null`
- `executions`: persisted recommendation execution records
- `timeline`: chronological incident facts such as created, evidence
  captured/unavailable, diagnosed, recommended, feedback, and resolved
- `limitations`: explicit reasons why evidence, feedback, executions, or
  historical context may be incomplete

The UI also displays dependency impact when the incident evidence includes a
captured dependency service ID.

### One-minute spoken explanation

“This is the unified investigation summary for the persisted incident. At the
top I have the original incident facts and lifecycle status. The evidence
section shows what the detector saw at creation time, not what the system
happens to measure now. The telemetry section shows the safe local snapshot.
Historical intelligence is calculated from earlier PostgreSQL incident rows.
Recommendation reasoning is the decision engine’s recorded input and ranking,
while operator feedback tells us whether a human accepted or rejected that
recommendation. Execution records are a separate lifecycle: planned,
accepted, executing, executed, failed, or cancelled. The timeline makes the
order of these facts visible, and the limitations section tells us what was
not available. This is why the page is more useful than a collection of
unrelated monitoring screens.”

### Execution lifecycle distinction

The backend supports persisted execution records and transitions:

```text
PLANNED → ACCEPTED → EXECUTING → EXECUTED
                         └──────→ FAILED
PLANNED or ACCEPTED → CANCELLED
```

An outcome assessment can be recorded only after `EXECUTED`. Execution
records are audit/lifecycle records; the current implementation does not call
real infrastructure. Operator feedback is also explicitly review feedback,
not proof that the recommendation was executed.

---

## Part 12 — Database and persistence

### PostgreSQL and SQLAlchemy

PostgreSQL is used because incidents, evidence JSON, telemetry snapshots,
feedback, and execution lifecycle records should survive page refreshes and
support historical queries. SQLAlchemy maps Python classes to PostgreSQL
tables and provides sessions for FastAPI routes.

### Important persisted models

`Incident` maps to `incidents` and stores the incident lifecycle and evidence.

`RecommendationExecution` maps to `recommendation_executions`. It has a
foreign key to `incidents`, execution status, method, actor, attempt number,
timestamps, error fields, and outcome-assessment fields. The database enforces
positive attempt numbers and unique `(incident_id, attempt_number)` pairs.

### Alembic migration history

The migration chain creates the baseline `incidents` table, adds evidence
snapshot, resolution timestamp, operator feedback, the recommendation
execution table, incident telemetry snapshot, and the planned-status default.
The startup script runs `alembic upgrade head` before Uvicorn.

### What to say to the panel

“Persistence is necessary because a monitoring screen only shows a moment,
while an investigation needs historical context. The database preserves the
incident as it was observed, allows deterministic historical comparisons, and
keeps recommendation feedback and execution lifecycle separate from the
incident’s own Open/Resolved status.”

---

## Part 13 — Actual ML and intelligence components

| Component | Input | Processing | Output/use | Type |
|---|---|---|---|---|
| `anomaly_detector.py` | CPU, memory, response time, requests, error rate, latency | 100-tree Isolation Forest plus weighted threshold rules; rule 60% and ML 40% in the hybrid score | anomaly flag, bounded score, reason, evidence fields; used by `/ml/detect-anomaly` and `/system-status` | Hybrid ML + rule-based |
| `root_cause.py` | CPU, memory, response time, error rate | Normalized threshold contributions with weights CPU .30, errors .25, memory .25, response .20; severity and highest weighted contributor | summary, primary issue, severity, confidence, details; used by `/system-status` | Deterministic rule/weighted analysis |
| `failure_prediction.py` | CPU, memory, response time, latency, error rate | Explicit critical/degradation/stable thresholds | `will_fail`, confidence, reason; used inside system-status forecast | Rule-based |
| `trend_analytics.py` | Recent in-memory metric samples | Compares older and newer halves; thresholds for CPU/memory/latency; counts increasing/decreasing metrics | per-metric trends and Worsening/Improving/Stable direction | Deterministic statistical comparison |
| `WhatIfSimulator._select_best_action()` | Current metrics, root cause, anomaly | Scores candidate remediation intents and selects highest/matching action | recommendation, candidates, ranking signal, risk, reason | Deterministic decision engine |
| `WhatIfSimulator.simulate()` | CPU, latency, action, severity/root-cause context | Applies action factors and severity multiplier with bounded variation | projected metrics, risk, confidence, explanation | Deterministic simulation with bounded random variation |
| `historical_intelligence.py` | Persisted incident rows | Temporal, exact-field, priority matching and deterministic counts | similar incidents and historical summary | Deterministic database analysis |
| `cascade_predictor.py` | Selected service ID and canonical graph | Compatibility adapter over breadth-first dependency analysis | affected services, paths, depth, blast-radius classification | Deterministic graph analysis |

`root_cause_model.py` is an older/simple rule-based implementation retained in
the repository; the active `/system-status` path imports and uses
`root_cause.py`. It should not be described as a separate active ML model.

The saved `anomaly_model.pkl` and `scaler.pkl` are loaded by the active
Isolation Forest detector when available. The `/ml/train` route can train from
`system_metrics.csv`; the normal dashboard flow loads the saved model and
still has rule-based behavior if the model cannot be loaded.

---

## Part 14 — Complete end-to-end demonstration story

Use the story **“Database overload is detected before it becomes a larger
service incident.”**

### 1. Establish the baseline — Dashboard

- **Action:** Open `/dashboard`, select Demo, then Database overload.
- **Show:** Scenario label, rising CPU/memory/response/latency, request/error
  cards, and diagnosis panel.
- **Say:** “I am introducing a controlled failure condition, not claiming that
  a real production database has failed.”
- **Technical:** `/demo/scenario/database_stress` is posted, then the page
  polls `/metrics`, `/system-status`, and `/metrics/history`.
- **Expected:** Values move toward the database-overload targets and the
  analysis becomes warning/critical as thresholds are crossed.

### 2. Show prediction — Predictions

- **Action:** Open `/predictions`.
- **Show:** Forecast, time window, anomaly score, trend, reason, and evidence.
- **Say:** “The predictor is explicit threshold logic, while the anomaly score
  is the hybrid detector output. These are related but not the same.”
- **Technical:** `GET /system-status` runs the complete analysis.
- **Expected:** A degradation/failure forecast with explainability.

### 3. Show persistence — Incidents

- **Action:** Open `/incidents`; select the latest high/critical row.
- **Show:** Counts, incident ID, service, severity, root cause, recommendation,
  status and timestamp.
- **Say:** “The system converted a transient analysis into a durable record.”
- **Technical:** `GET /incidents/all`, `/statistics`, `/patterns`; incident is
  stored in PostgreSQL by the system-status persistence path.
- **Expected:** One active evidence-backed incident, with deduplication on
  repeated polling.

### 4. Show immutable evidence and telemetry snapshot

- **Action:** Scroll through Evidence captured at incident creation and
  Incident-time telemetry.
- **Show:** The original metric values, score, rule evidence, Isolation Forest
  evidence, primary issue, confidence, trend, and safe local summary.
- **Say:** “This is historical evidence. Later current values do not rewrite
  the diagnostic record.”
- **Technical:** JSONB fields on `incidents`, returned through the investigation
  summary.

### 5. Show recommendation analysis

- **Action:** Scroll to Recommendation reasoning.
- **Show:** Recommended action, decision-engine score, selection factors,
  candidate ranking, and evidence.
- **Say:** “This ranking is explainable and deterministic. It is not a claim of
  guaranteed success.”
- **Technical:** `_select_best_action()` and `_recommendation_explanation()`.

### 6. Show history and timeline

- **Action:** Scroll to Historical Incident Intelligence and Incident timeline.
- **Show:** Similar incidents/counts, historical recommendation frequency,
  timeline events, and limitations.
- **Say:** “History comes from earlier persisted incidents and is bounded by
  exact recorded fields and timestamps.”
- **Technical:** `get_historical_intelligence()` and timeline construction in
  `incident_api.py`.

### 7. Simulate the response

- **Action:** Click Simulate recommendation, then Simulate selected action.
- **Show:** Projected CPU/latency, risk, confidence, and explanation.
- **Say:** “This is decision support only. The backend changes no actual
  infrastructure.”
- **Technical:** `POST /simulator/simulate`; `WhatIfSimulator.simulate()`.

### 8. Show topology and blast radius

- **Action:** Return to Incidents, click View service impact if enabled, or
  open `/service-map` and select `db`.
- **Show:** Direct and transitive dependents, depth and blast-radius severity.
- **Say:** “The canonical graph explains how a database issue can affect auth,
  payment, inventory, order and gateway paths.”
- **Technical:** static `SERVICE_DEPENDENCIES`, reverse breadth-first traversal,
  `/service-dependencies/{id}/impact`.

### 9. Finish with local telemetry

- **Action:** Open `/telemetry`.
- **Show:** host summary, network, ports, processes, and risk signals.
- **Say:** “This page is local host diagnostics, separate from the synthetic
  service scenario, and the incident stores only a safe summary.”

### 10. Optional audit actions

- Record accepted/rejected operator feedback and explain that it is not
  execution.
- Create a planned recommendation execution and, if desired, demonstrate its
  state transitions. Do this only if the panel asks; it can consume time.
- Resolve the incident and show `Resolved` plus persisted `resolved_at`.

---

## Part 15 — Likely panel questions and accurate answers

### A. Basic project questions

**What problem does AutoOps Pro solve?**

It connects monitoring, explainable diagnosis, historical incident context,
recommendation, and non-destructive simulation in one operator workflow.

**Is it an autonomous production engineer?**

It is an AI-assisted operations prototype. The current implementation
recommends, records, and simulates actions; it does not automatically change
real infrastructure.

**What is narrative intelligence here?**

The system turns signals into explainable text: root-cause details,
recommendation reasons, historical context, timeline events, and limitations.

### B. Architecture questions

**How does data flow?**

Metrics enter the shared backend contract, analysis functions produce anomaly,
diagnosis, trends, recommendation and forecast, high-severity conditions are
persisted, and React retrieves the results through typed API helpers.

**Why separate current metrics and incident snapshots?**

Current metrics change continuously. Snapshots preserve what was observed for a
specific historical incident.

**Why are there both `/topology` and `/dependency/topology`?**

The application exposes the canonical topology through the legacy root route
and the explicit dependency API. Both use the same service graph.

### C. Python/FastAPI questions

**Why FastAPI?**

It provides typed request/response boundaries, routing, dependency-injected
database sessions, OpenAPI generation, and simple integration with Python
analysis code.

**How is an unavailable database handled?**

Incident routes return a truthful generic 503 persistence error. The UI shows
that incident data is unavailable instead of treating it as an empty result.

**What does startup do?**

`start_backend.sh` resolves the repository root, runs Alembic using the root
`alembic.ini`, then starts Uvicorn from `backend` only if migration succeeds.

### D. React questions

**How does the frontend integrate with the backend?**

`frontend/src/services/api.ts` centralizes typed fetch requests, timeout and
error handling. Pages call these functions and render loading/error/empty
states.

**Why are pages lazy-loaded?**

`App.tsx` uses React lazy imports for the major pages, with a Suspense loading
fallback.

**What is client-side auth?**

The current auth flow controls frontend routes and initialization state. It is
not production-grade backend authentication.

### E. PostgreSQL questions

**What is stored?**

Incidents, immutable JSON evidence, safe telemetry snapshots, resolution and
operator feedback, plus recommendation execution lifecycle records.

**Why JSONB for snapshots?**

Snapshots contain structured but evolving diagnostic payloads that should be
read as one historical record while core incident fields remain relational.

**How is history calculated?**

By querying persisted incidents and applying deterministic temporal and exact
field matching rules.

### F. Machine-learning questions

**Which actual ML algorithm is used?**

scikit-learn Isolation Forest with a StandardScaler. The saved model contains
100 trees.

**Is every intelligence component ML?**

No. Root cause, prediction, trends, recommendations, historical matching, and
dependency impact are deterministic/rule-based components. Only anomaly
detection includes the trained Isolation Forest.

**Why combine rules and ML?**

Rules provide interpretable operational thresholds; Isolation Forest can flag
unusual combinations that fixed thresholds may miss. The code exposes both
signals.

### G. Anomaly-detection questions

**What are the threshold values?**

Detector thresholds are CPU 80, memory 85, response time 200 ms, error rate 5,
and latency 200 ms. Critical overrides use CPU 85, memory 90, effective
latency 350 ms, or error rate 5.

**What does the score mean?**

It is a bounded hybrid signal from 0 to 1, not a calibrated probability.

**What happens if the model file is unavailable?**

Rule-based detection remains active. The saved model is loaded when available.

### H. Root-cause questions

**How is primary issue selected?**

Each breached metric contributes a normalized value multiplied by its
operational weight. The highest weighted contribution becomes the primary
issue.

**What are the root-cause weights?**

CPU .30, error rate .25, memory .25, response time .20.

**Why normalize?**

CPU percentage, error percentage, and milliseconds are different units. Raw
numeric comparison would be misleading.

### I. Failure-prediction questions

**Is the predictor trained?**

No. `failure_prediction.py` is an explicit rule-based predictor, and the
system forecast adds trend-informed time-window logic.

**What does confidence mean?**

Rule-analysis confidence, not measured accuracy or probability of failure.

### J. Historical-intelligence questions

**How are similar incidents found?**

Priority matching uses same service plus root cause, then same service plus
anomaly, then same root cause, limited to prior timestamped records.

**Is it semantic AI search?**

No. It is deterministic persisted-record matching.

**What if there is no history?**

The response and UI show no historical intelligence or an explicit limitation;
current telemetry is not used to fabricate past evidence.

### K. Recommendation questions

**How is an action selected?**

The decision engine scores finite actions from current pressure, root cause,
anomaly state, and severity, then selects the best/matching action.

**Is the score probability of success?**

No. It is a ranking signal used to explain selection.

**Does accepted feedback mean remediation happened?**

No. Feedback records an operator review only.

### L. Simulator questions

**What does the simulator change?**

Nothing outside its returned calculation. It only projects CPU/latency and
reports modeled risk/confidence.

**What actions exist?**

Vertical scaling, horizontal scaling, queue/caching optimization, graceful
restart, memory/GC tuning, and rate limiting.

### M. Testing questions

**What is tested?**

Backend tests cover incident lifecycle, concurrency/deduplication, evidence,
telemetry snapshots, investigation summaries, recommendations, dependencies,
database validation, CORS, and anomaly terminology. Frontend tests cover
incident UI and telemetry snapshot behavior.

**What frontend commands are used?**

`npm test`, `npm run build`, and `npm run lint`.

**What backend database is required for integration tests?**

PostgreSQL with a safe test URL such as `autoops_test` or `autoops_ci`.

### N. Limitations

**What are the main limitations?**

Telemetry is synthetic in demo mode; live mode is local-host telemetry, not
distributed service telemetry. Prediction is rule-based. Topology is static
and health is synthetic. There is no real service discovery, tracing, LLM
assistant, or production remediation. Authentication is client-side only.

### O. Future improvements

**What would you build next?**

Production service integrations, authenticated backend identity, real service
discovery and distributed tracing, a larger labelled incident dataset, a
calibrated forecasting model, and controlled infrastructure connectors with
approval and rollback safeguards.

---

## Part 16 — “Why did you use this?” answers

| Technology/component | Viva answer |
|---|---|
| Python | It lets us express the monitoring and analysis logic clearly and has a strong ecosystem for data processing, psutil, and scikit-learn. |
| FastAPI | It gives typed API boundaries, automatic validation/OpenAPI, async-compatible routes, and simple Python integration. |
| React | It supports a component-based dashboard where each operational module can manage its own state and loading/error UI. |
| TypeScript | It makes frontend API contracts and nested incident/investigation data safer to use. |
| PostgreSQL | It provides durable relational incident history and native JSONB for structured snapshots. |
| SQLAlchemy | It maps the incident and execution models to database tables and manages sessions cleanly in routes. |
| Alembic | It version-controls schema evolution and lets startup upgrade the database before serving. |
| scikit-learn | Isolation Forest provides unsupervised outlier detection when labelled failure data is not available. |
| Uvicorn | It is the ASGI server that runs the FastAPI application. |
| Vite | It provides fast frontend development and production bundling for the React/TypeScript app. |
| Vitest | It runs the frontend unit/component test suite in the Vite ecosystem. |
| React Testing Library | It tests frontend behavior from the user’s perspective, including visible loading, empty, and data states. |
| psutil | It provides local CPU, memory, process, network, disk, and system information for the live/local telemetry mode. |
| Recharts | It renders the Dashboard’s historical telemetry chart. |
| Tailwind CSS | It provides the current compact dashboard styling and responsive layouts. |

---

## Part 17 — Real limitations and reasonable improvements

| Current limitation | Truthful explanation | Reasonable future improvement |
|---|---|---|
| Synthetic demo telemetry | Demo scenarios are generated toward fixed targets with bounded fluctuation. | Connect to real application/service metrics while retaining a safe demo fixture. |
| Local live telemetry | Live mode maps this machine’s psutil values into the service metric contract; it is not remote distributed monitoring. | Add authenticated collectors and per-service exporters. |
| Rule-based failure prediction | The failure predictor uses explicit thresholds and trend adjustments, not a trained failure model. | Train and calibrate a forecasting model on labelled time-series incidents. |
| Static service topology | Nodes and dependencies are hard-coded in `service_graph.py`; there is no discovery. | Integrate service registry, deployment metadata, or tracing data. |
| Synthetic service health | Health overlays follow demo scenario names and do not probe real services. | Add real health checks and dependency probes. |
| Simulation only | Recommendations and simulator outputs do not change real infrastructure. | Add approval-gated adapters, dry runs, rollback, and audit controls. |
| Limited historical scale | Historical intelligence loads incidents into Python and is documented as suitable for datasets below roughly 100K incidents. | Move matching/counts to indexed database queries or an analytics store. |
| Client-side authentication | Frontend auth state controls routes but is not production identity/security. | Add backend authentication, authorization, and secret/session handling. |
| No real LLM assistant | Narrative text is generated by deterministic templates and stored facts. | Add a guarded language layer only after preserving fact boundaries and auditability. |
| WebSocket not used by frontend | A `/ws/metrics` backend endpoint exists, but the current Dashboard uses HTTP polling. | Add a frontend WebSocket consumer when streaming behavior is required. |
| Model version warning risk | Saved scikit-learn artifacts can warn when loaded under another library version. | Pin training/runtime versions and manage model metadata. |

---

## Part 18 — Five-minute emergency demo

### 0:00–0:40 — Introduction

Say: “AutoOps Pro is an explainable operations-assistance pipeline. It
connects telemetry, hybrid anomaly detection, weighted diagnosis, persisted
incidents, recommendations, historical context, and safe what-if simulation.”

### 0:40–1:30 — Dashboard

Open `/dashboard`, choose Demo, choose **Database overload**. Point to the
metric cards and diagnosis. Say that this is controlled synthetic telemetry
for repeatability.

### 1:30–2:10 — Predictions

Open `/predictions`. Point to forecast, time-to-failure, trend, score, and
explainability. State clearly that failure prediction is rule-based and the
anomaly score is not probability.

### 2:10–3:20 — Incident investigation

Open `/incidents`, select the newest record, and show the persisted summary,
evidence snapshot, timeline, recommendation reasoning, and historical
intelligence.

### 3:20–4:10 — Simulator

Click **Simulate recommendation**, run it, and show projected metrics, risk,
confidence, and explanation. Say that nothing real is changed.

### 4:10–4:45 — Service Map and Telemetry

Show `/service-map` with `db` selected, then `/telemetry` System Overview.
Explain static dependency analysis and local host diagnostics in one sentence
each.

### 4:45–5:00 — Close

“The main contribution is the auditable chain from signal to explanation and
decision support. The implementation is intentionally honest about prototype
boundaries: simulation is not execution, static topology is not discovery,
and rule confidence is not calibrated probability.”

---

## Part 19 — Ideal ten-to-fifteen-minute full demo

| Time | Screen/topic | Main point |
|---:|---|---|
| 1:30 | Introduction | Problem, objective, and architecture |
| 2:00 | Dashboard | Current metrics, demo source, scenario selection, diagnosis |
| 1:15 | Predictions | Rule-based forecast, trend, anomaly distinction |
| 2:30 | Incidents | Persisted record, evidence, telemetry snapshot, timeline |
| 1:30 | Historical intelligence | Deterministic previous-incident context |
| 1:15 | Recommendation analysis | Candidate ranking and evidence |
| 1:30 | AI Simulator | Non-destructive projected action impact |
| 1:30 | Unified investigation | Combined response, limitations, feedback/executions |
| 1:00 | Service Map | Static topology and dependency blast radius |
| 1:00 | Telemetry | Local psutil diagnostics and safety boundary |
| 0:30 | Conclusion | Contribution and limitations |

If the panel asks detailed questions during the incident screen, skip the
separate Predictions explanation because its data is already visible in the
same investigation story.

---

## Part 20 — One-page cheat sheet

### Project objective

Provide explainable operations assistance from telemetry to diagnosis,
incident memory, recommendation, and safe what-if analysis.

### Technology stack

React 19, TypeScript, Tailwind CSS, Recharts, Framer Motion, Vite, Vitest,
React Testing Library, Python, FastAPI, Pydantic, Uvicorn, SQLAlchemy,
PostgreSQL, Alembic, psutil, pandas, joblib, and scikit-learn.

### Architecture

Demo/live metrics → anomaly detector → weighted root cause → trend analysis →
recommendation → incident/evidence persistence → historical intelligence,
feedback, executions, timeline, dependency impact, and simulator.

### Main modules

- Dashboard: current metrics, trend chart, diagnosis, recommendation, incidents
- Predictions: integrated forecast and evidence view
- Incidents: persisted investigation hub
- Service Map: canonical static dependency graph and impact analysis
- Telemetry: local host diagnostic collectors and risk signals
- AI Simulator: finite non-destructive action projection

### ML/intelligence components

- Isolation Forest anomaly detector: actual ML component
- Rule thresholds: interpretable anomaly and failure logic
- Weighted root cause: deterministic diagnosis
- Trend engine: recent-window comparison
- Decision engine: deterministic action ranking
- Historical intelligence: deterministic persisted-record matching
- Cascade predictor: deterministic graph traversal

### Database

PostgreSQL tables: `incidents` and `recommendation_executions`; snapshots are
JSONB; Alembic upgrades the schema before Uvicorn starts.

### Important APIs

```text
GET  /metrics
GET  /system-status
GET  /metrics/history
GET  /metrics/mode
POST /metrics/mode/{mode}
POST /demo/scenario/{name}

GET  /incidents/all
GET  /incidents/statistics
GET  /incidents/patterns
GET  /incidents/{id}/investigation-summary
GET  /incidents/{id}/intelligence
POST /incidents/{id}/feedback
PUT  /incidents/{id}

POST /simulator/simulate
GET  /topology
GET  /service-health
GET  /service-dependencies/{service_id}/impact

GET  /telemetry/system
GET  /telemetry/network-interfaces
GET  /telemetry/listening-ports
GET  /telemetry/processes
GET  /telemetry/risk-signals
```

### Testing

Backend: pytest suite covering analysis, incident lifecycle, persistence,
concurrency, telemetry, recommendations, dependency analysis, CORS, and
database validation. Frontend: Vitest and React Testing Library. Build:
TypeScript compiler plus Vite. Lint: ESLint.

### Main limitation

This is a local/demo prototype: demo telemetry, static topology, local host
telemetry, rule-based failure prediction, no production authentication, and no
real infrastructure execution.

### Future scope

Real service telemetry/discovery, distributed tracing, calibrated forecasting,
backend authentication, guarded infrastructure connectors, rollback, and
larger historical datasets.

### One sentence per frontend tab

- **Dashboard:** “This is the live operational overview and the entry point to
  the analysis pipeline.”
- **Predictions:** “This presents the current rule-based, trend-informed
  failure forecast and its evidence.”
- **Incidents:** “This turns high-severity analysis into a persisted,
  auditable investigation.”
- **Service Map:** “This explains how a selected service failure can propagate
  through the canonical dependency graph.”
- **Telemetry:** “This shows safe local host diagnostics collected through
  psutil.”
- **AI Simulator:** “This estimates the effect of a finite remediation action
  without changing infrastructure.”

---

## Exact route reference for the presenter

### Frontend routes

`/dashboard`, `/predictions`, `/incidents`, `/service-map`, `/telemetry`,
`/ai-simulator`, `/settings`, `/login`, `/signup`, and `/init`.

### Backend route groups

- Root/system: `/`, `/metrics`, `/system-status`, `/prediction`,
  `/simulate-cascade`, `/topology`, `/service-health`,
  `/service-dependencies/{service_id}/impact`, `/metrics/history`, and
  `/ws/metrics`
- Demo controls: `/demo/scenarios`, `/demo/scenario/{name}`,
  `/metrics/mode`, `/metrics/mode/{mode}`
- ML: `/ml/detect-anomaly`, `/ml/train`, `/ml/model-status`
- Simulator: `/simulator/simulate`
- Telemetry: `/telemetry/...`
- Dependency API: `/dependency/topology`, `/dependency/impact/{service_id}`
- Incidents: `/incidents/...` as listed above

The current frontend’s main prediction integration is `/system-status`; the
legacy `/prediction` endpoint is not the source used by the Predictions page.

