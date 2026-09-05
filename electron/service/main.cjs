const { createServer } = require('node:http')

const defaultHost = '127.0.0.1'
const defaultPort = 45123

function getStatus() {
  return {
    serviceName: 'coscience-local-service',
    version: '0.1.0',
    process: {
      pid: process.pid,
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
    cwd: process.cwd(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }
}

function startServer(port = defaultPort, host = defaultHost) {
  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' })
      return
    }

    const pathname = new URL(request.url || '/', 'http://localhost').pathname
    if (pathname === '/health') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/status') {
      sendJson(response, 200, getStatus())
      return
    }

    sendJson(response, 404, { error: 'Not found' })
  })

  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Local service did not expose a TCP address.'))
        return
      }
      resolve({
        server,
        host,
        port: address.port,
        url: `http://${host}:${address.port}`,
      })
    }

    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
}

function stopServer(service) {
  if (!service || !service.server.listening) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    service.server.close((error) => error ? reject(error) : resolve())
  })
}

function sendJson(response, statusCode, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.writeHead(statusCode)
  response.end(JSON.stringify(value))
}

module.exports = {
  getStatus,
  startServer,
  stopServer,
}
