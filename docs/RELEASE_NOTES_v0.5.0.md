# StockPair v0.5.0 release notes

## Purpose

Version 0.5.0 turns the v0.4 emergency security release into a complete product and repository handoff. It preserves the fail-closed transaction controls while adding the user interface, local bootstrap, deployment validation, hosting configuration, CI, governance files, and operator/agent documentation required for a controlled launch process.

## User interface

- Reorganized navigation and responsive mobile controls.
- Added clear deployment-posture, wallet, indexer-stream, and trust-anchor status.
- Added a full Settings and Diagnostics surface.
- Added privacy controls and local-data reset.
- Added installable application metadata, branded icons, social preview, and loading state.
- Kept public administrative operations disabled by default.

## Vercel and runtime deployment

- Added root `vercel.json` for the static Vite frontend.
- Added production environment validation and generated Content Security Policy.
- Production builds reject localhost, embedded credentials, missing factory trust anchors, or enabled public operations.
- Added a separate unprivileged Docker image for the stateful read-only indexer and SSE service.

## GitHub handoff

- Added current CI, CodeQL, dependency review, Dependabot, and tagged-release workflows.
- Added pull-request and issue templates.
- Added repository and agent operating guides.
- Added release checks that reject local deployment state and concrete secret material.

## Local development

- Added Node 22 pinning and deterministic locked installs.
- Added a one-command setup script and one-command full local demo.
- Added complete environment, deployment, acceptance-test, and troubleshooting documentation.

## Security boundary

This release is a source and deployment candidate. It is not a statement that the protocol is unhackable, audited, approved, or safe for real-value deployment. The v0.3 incident root cause remains unproven without attack transactions and infrastructure evidence. Independent smart-contract, frontend, infrastructure, economic, and operational reviews remain mandatory.
