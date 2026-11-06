# DSH Deployment Rollback Proof

**Maintainer / Author：He Fangsheng (贺方升 / 贺去病; also known as Dosen) · [hequbing.com](https://www.hequbing.com)**

Offline, deterministic evidence that every declared deployment target stopped serving one failed artifact and converged within RTO to the same last-known-good digest.

This plugin **does not execute rollback**, authenticate receipts, grant authorization, observe live infrastructure, or prove application correctness. It verifies an explicit, hash-only manifest. That boundary is deliberate:

- [`dsh-rollback`](https://github.com/Taler97/dsh-rollback) restores file mutations; this plugin never mutates a deployment.
- [`dsh-recovery-proof`](https://github.com/dongsheng123132/dsh-recovery-proof) verifies isolated recovery drills; this plugin verifies post-incident deployment-target convergence.
- The DeepSeek Harness rollback handbook is a runbook; this plugin produces a machine-readable settlement verdict.
- [`dsh-artifact-promotion-proof`](https://github.com/dongsheng123132/dsh-artifact-promotion-proof) proves positive promotion settlement; this plugin proves failed-version removal and last-known-good restoration.

## Evidence model

The manifest declares the failed digest, last-known-good digest, incident/authorization/plan receipt hashes, RTO and freshness limits, exact target set and replica counts. One observation per target binds a rollback receipt and health-probe hash to the incident and plan. The verifier checks:

- exact target coverage and contiguous observation sequence;
- minimum distinct observers;
- environment binding and one last-known-good digest across all targets;
- zero active failed-artifact replicas and exact known-good replica convergence;
- incident/plan binding, chronology, RTO and evidence freshness.

Only hashes, counts, timestamps and verdicts enter the report. Keys named like `secret`, `authorization`, `raw`, `body`, `content`, `log`, `prompt` or `chat`, plus secret-shaped values, are rejected.

## Use

```bash
npm test
node bin/dsh-deployment-rollback-proof.mjs inspect examples/rolled-back.json
node bin/dsh-deployment-rollback-proof.mjs verify examples/rolled-back.json
```

DSH installs the bundle from `cordis.patch.yml` and exposes:

- `dsh_deployment_rollback_inspect`
- `dsh_deployment_rollback_verify`

The standalone stdio MCP server exposes `deployment_rollback_inspect` and `deployment_rollback_verify`. The DSH verifier writes only beneath an explicit workspace-relative `artifactDir`, rejects path escape/symlinks, creates a content-addressed report exclusively, and verifies it by read-back.

## Manifest

See [`examples/rolled-back.json`](examples/rolled-back.json). Inputs are claims bound by hashes, not authenticated facts. A `rolled-back` verdict means only that the supplied structured evidence satisfies the declared policy.

## Security

See [SECURITY.md](SECURITY.md). Node.js 22 or later is required. Licensed under MIT.

