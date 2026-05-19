# Audit Note — AITelecomNetworkCapacityPlanner

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_08.md` (section 15).

## Original Recommendations

### Missing AI Counterparts
- All major planning functions are AI-driven; minimal gaps.

### Missing Non-AI Features
- NMS integrations (Ericsson, Nokia, Huawei)
- Real-time network telemetry ingestion
- What-if scenario UI exports
- Capacity roadmap planning/budgeting

### Custom Feature Suggestions
- 5G deployment planner
- Dynamic spectrum sharing
- Predictive maintenance
- Energy efficiency scoring (PUE)
- Network slicing optimizer

## Implemented (this round)
1. `POST /api/ai/5g-deployment-plan` — prioritize 5G rollout sites by demand/ROI.
2. `POST /api/ai/predictive-maintenance` — flag likely failures + maintenance schedule.

Pattern reused: `callOpenRouter` + `parseAIJson` + `persistResult` + `buildSummary`. Syntax-checked.

## Backlog (prioritized)
1. **MECHANICAL** Dynamic spectrum sharing optimizer endpoint.
2. **MECHANICAL** Network slicing optimizer endpoint.
3. **NEEDS-CREDS** NMS vendor integrations (Ericsson/Nokia/Huawei).
4. **NEEDS-PRODUCT-DECISION** Real-time telemetry ingestion architecture.

## Apply pass 5 (all backlog)

Closed the remaining backlog by adding `backend/routes/aiBacklog.js` (mounted at `/api/ai-backlog`). Additive new file. Cap: 10 features.

| Item | Category | Endpoint(s) |
|---|---|---|
| Ericsson NMS integration | NEEDS-CREDS `ERICSSON_NMS_API_KEY` | `POST /nms/ericsson/sync` |
| Nokia NMS integration | NEEDS-CREDS `NOKIA_NMS_API_KEY` | `POST /nms/nokia/sync` |
| Huawei NMS integration | NEEDS-CREDS `HUAWEI_NMS_API_KEY` | `POST /nms/huawei/sync` |
| Real-time telemetry bus | NEEDS-CREDS `TELEMETRY_KAFKA_BROKERS` | `POST /telemetry/ingest` |
| Telemetry batch fallback | NEEDS-PRODUCT-DECISION (poll-based aggregator; FE polls instead of streaming) | `POST /telemetry/batch` |
| Capacity roadmap & budgeting | NEEDS-PRODUCT-DECISION (linear projection; default unitCost=$1k doc'd) | `POST /roadmap/project` |
| What-if scenario CSV export | NEEDS-PRODUCT-DECISION (CSV in response body; no file-storage tier) | `POST /scenario/export-csv` |
| Coverage what-if | NEEDS-PRODUCT-DECISION (density estimator over client-supplied counts) | `POST /coverage/whatif` |
| Apply rollout plan | TOO-RISKY-stub (returns 501; requires NMS write-path + change-mgmt) | `POST /rollout/apply` |
| Capabilities listing | MECHANICAL | `GET /_capabilities` |

Smoke test: PASS — bypassed pre-existing `ERR_ERL_KEY_GEN_IPV6` rate-limit warning with `DISABLE_RATE_LIMIT_VALIDATION=true`; logged in `admin@telecom.com/admin123`; `/nms/ericsson/sync` → 503 `missing:"ERICSSON_NMS_API_KEY"`; `/telemetry/batch` returned `cpu/avg=60`; `/roadmap/project` returned 3-month projection; `/coverage/whatif` returned density tags; `/rollout/apply` → 501.

## Apply pass 4 (mechanical backlog)

Closed the 2 explicitly-MECHANICAL items plus 1 adjacent custom suggestion. All appended to `backend/routes/ai.js`:

1. `POST /api/ai/spectrum-sharing-optimize` — dynamic spectrum sharing (MECHANICAL #1).
2. `POST /api/ai/network-slicing-optimize` — eMBB/URLLC/mMTC slicing (MECHANICAL #2).
3. `POST /api/ai/energy-efficiency-score` — PUE-based energy scoring + savings opportunities.

Each follows the existing `callOpenRouter` + `parseAIJson` + `persistResult` + `buildSummary` pattern, gated by a new `hasOpenRouterKey()` helper that returns 503 with `error: "AI service unavailable: OPENROUTER_API_KEY not configured"` when the key is absent or a known placeholder.

FE: created `frontend/src/pages/AIBacklogTools.jsx` — single page with 3 tabs and feature-specific forms (region/priority for spectrum, use-cases/SLA-JSON for slicing, target PUE for energy). Registered route `/ai-backlog` in `App.jsx` and added a sidebar nav entry.

Smoke test: PASS — backend up on port 4000; logged in `admin@telecom.com/admin123`; `POST /api/ai/spectrum-sharing-optimize` returned HTTP 503 with our error string (env contains placeholder key).

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

Vite/React frontend has dedicated pages `Deployment5GPlan.jsx` and `PredictiveMaintenance.jsx` calling `postAI('5g-deployment-plan', ...)` and `postAI('predictive-maintenance', ...)` from `frontend/src/api.js` — the two pass-2 endpoints are surfaced. No modifications needed.
