import type { JobHandler } from './types'

const handlers = new Map<string, JobHandler>()

export function registerHandler(jobType: string, handler: JobHandler): void {
  handlers.set(jobType, handler)
}

export function getHandler(jobType: string): JobHandler | undefined {
  return handlers.get(jobType)
}

export function getRegisteredTypes(): string[] {
  return Array.from(handlers.keys())
}
