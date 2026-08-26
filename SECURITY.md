# Security Policy

## Supported version

Security fixes target the latest release on `main`.

## Trust boundary

This verifier is offline and non-destructive. It does not contact targets, execute rollback, authenticate evidence, grant authorization, or prove application correctness. Treat every manifest field as an untrusted claim until independently authenticated.

Inputs are capped at 4 MiB. Workspace paths must be relative and remain beneath the explicit workspace root. Manifest and artifact paths reject symlinks; report writes are exclusive, content-addressed, and verified by read-back. Reports omit original business text and reject secret-shaped fields and values.

Report vulnerabilities privately through GitHub Security Advisories. Do not include production manifests, credentials, raw logs, or private business data.

