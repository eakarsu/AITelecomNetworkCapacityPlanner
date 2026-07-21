# Production readiness

The governed API at `/api/governance` is the supported network-capacity change path. It records tenant-scoped telemetry/NMS evidence, constraints, replay results, operator-reviewed plans, approved observations, rollback/outcome evidence, an idempotent network-management outbox, bounded retries, immutable attempts, and dead-letter state. It never changes network configuration or dispatches field work.

## Deployment sequence

1. Review and back up the database, then apply `backend/migrations/001_governed_capacity_change.sql` separately using the target database credentials.
2. Copy `.env.example` to `.env`, replace placeholders, and configure a unique 32-plus-character JWT secret and explicit production CORS allowlist.
3. Install locked dependencies explicitly. `start.sh` only supervises the installed backend and frontend.
4. Provision memberships and deploy reviewed connector workers for telemetry, NMS, ERP/WMS/TMS, read-only SCADA/device, GIS, weather, maintenance, and notifications. Workers post opaque receipts; they do not receive raw secrets through workflow payloads.

Production rejects legacy provider routes, mock/demo flags, wildcard CORS, weak secrets, and startup schema mutation. Generated Ericsson/Nokia and other AI/gap surfaces are quarantined by default.

## Required external validation

Validate Ericsson/Nokia NMS contracts and authorization in a lab, never first against live network equipment. Replay historical fixtures and measure accuracy, constraint violations, latency, missed telemetry, rollback, retry exhaustion, dead-letter recovery, and realized capacity outcomes. Qualified network and safety operators retain approval and rollback authority; no hardware or NMS execution was performed here.
