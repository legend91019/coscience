# AI service

`src/service/ai.ts` and `electron/service/ai-service.cjs` provide the
conversation boundary for CoScience.

The service is OpenAI-compatible at the transport level:

- `POST /chat/completions`
- `Authorization: Bearer <api key>`
- JSON request bodies with `model`, `messages`, and `stream`
- JSON responses for normal completions
- SSE parsing for streaming responses

The service accepts the API key lazily so the Electron main process can resolve
it from a safeStorage-backed boundary before the request is sent. The service
does not persist secrets and does not log them.

Errors are normalized into `AiServiceError` with structured kinds:

- `config` for missing configuration
- `timeout` for expired requests
- `abort` for caller cancellation
- `http` for non-2xx API responses
- `network` for transport failures
- `parse` for invalid response payloads

The service is covered by focused tests in:

- `src/service/ai.test.ts`
- `electron/service/ai-service.test.cjs`
