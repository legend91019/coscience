# Local service

The local service is a read-only HTTP boundary for the Electron desktop shell.
It binds to `127.0.0.1:45123` by default and can be overridden with
`COSCIENCE_SERVICE_PORT`.

## Endpoints

- `GET /health` returns `{ "ok": true }`.
- `GET /api/status` returns the current service process, workspace, and Node
  runtime metadata.

Responses are JSON and include permissive CORS headers so the Vite renderer can
read the service during local development. The service has no filesystem,
remote execution, shutdown, or credential-handling routes.

The permissive CORS policy is intentional for the local renderer and is not an
authentication boundary. The service binds only to loopback and exposes
read-only runtime metadata in this milestone; sensitive capabilities must use a
narrower authenticated interface when they are added.

`src/service/status.ts` and `src/service/http.ts` are the TypeScript contract
and testable implementation. `electron/service/main.cjs` mirrors that small
contract for the packaged Electron main process, where the renderer build does
not ship the TypeScript source tree.
