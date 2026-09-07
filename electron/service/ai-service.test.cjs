const assert = require('node:assert/strict')
const test = require('node:test')

const packagedService = require('./ai-service.cjs')

function jsonResponse(status, value, init) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init && init.headers ? init.headers : {}),
    },
    ...(init || {}),
  })
}

test('exports the packaged AI service contract', async () => {
  assert.equal(typeof packagedService.createAiService, 'function')
  assert.equal(typeof packagedService.AiServiceError, 'function')

  const calls = []
  const service = packagedService.createAiService({
    baseURL: 'https://api.example.test/v1',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-key',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init })
      return jsonResponse(200, {
        id: 'chatcmpl-1',
        choices: [{ message: { role: 'assistant', content: 'Hello back' } }],
      })
    },
  })

  const result = await service.complete({
    messages: [{ role: 'user', content: 'Hello' }],
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.example.test/v1/chat/completions')
  assert.equal((calls[0].init.headers).get('authorization'), 'Bearer sk-test-key')
  assert.equal(result.choices[0].message.content, 'Hello back')
})
