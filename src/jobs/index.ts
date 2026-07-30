import { startWorker, requestShutdown } from './worker'
import { startScheduler, requestSchedulerShutdown } from './scheduler'
import { registerHandler } from './registry'
import { pdfGenerationHandler } from './handlers'
import { logger } from './utils/logger'

async function main(): Promise<void> {
  registerHandler('pdf_generation', pdfGenerationHandler)

  logger.info('background jobs worker starting', {
    node_version: process.version,
    platform: process.platform,
    pid: process.pid,
  })

  process.on('SIGTERM', () => {
    logger.info('received SIGTERM, shutting down...')
    requestShutdown()
    requestSchedulerShutdown()
  })

  process.on('SIGINT', () => {
    logger.info('received SIGINT, shutting down...')
    requestShutdown()
    requestSchedulerShutdown()
  })

  process.on('uncaughtException', (err) => {
    logger.error('uncaught exception', { error: err.message, stack: err.stack })
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled rejection', { error: String(reason) })
  })

  await Promise.all([
    startWorker(),
    startScheduler(),
  ])
}

main().catch((err) => {
  logger.error('fatal error', { error: String(err) })
  process.exit(1)
})
