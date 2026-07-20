# Read-only indexer container

Build from the repository root:

```bash
docker build -f deploy/indexer/Dockerfile -t stockpair-indexer:0.9.0 .
```

Run with an environment file stored outside the repository:

```bash
docker run --rm --env-file /secure/path/indexer.env -p 8787:8787 stockpair-indexer:0.9.0
```

The container sets `HOST=0.0.0.0` so the mapped port is reachable. Place it behind TLS, a strict origin allowlist, rate limiting and health monitoring. The source default remains loopback-only for direct local execution. The container has no wallet, signer, write endpoint, or private-key requirement. See `docs/INDEXER_DEPLOYMENT.md`.
