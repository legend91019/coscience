export type ServiceStatus = {
  serviceName: 'coscience-local-service'
  version: string
  process: {
    pid: number
    uptimeSeconds: number
    memoryUsage: NodeJS.MemoryUsage
  }
  cwd: string
  nodeVersion: string
  platform: NodeJS.Platform
  arch: string
}

const serviceVersion = '0.1.0'

export function getStatus(): ServiceStatus {
  return {
    serviceName: 'coscience-local-service',
    version: serviceVersion,
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
