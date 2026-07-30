import { getAdminClient } from '../lib/supabase'
import { getHandler } from './registry'
import { logger } from './utils/logger'
import { calculateScheduledAt } from './utils/retry'
import type { BackgroundJob } from './types'

const POLL_INTERVAL_MS = 5000
const HEARTBEAT_INTERVAL_MS = 10000
const HOSTNAME = typeof process !== 'undefined' ? (process.env.HOSTNAME || 'localhost') : 'localhost'

let shutdownRequested = false

export function requestShutdown(): void {
  shutdownRequested = true
}

export async function startWorker(): Promise<void> {
  logger.info('worker starting', { hostname: HOSTNAME, pid: process.pid })

  while (!shutdownRequested) {
    try {
      await processNextJob()
    } catch (err) {
      logger.error('worker loop error', { error: String(err) })
    }

    if (!shutdownRequested) {
      await sleep(POLL_INTERVAL_MS)
    }
  }

  logger.info('worker stopped')
}

async function processNextJob(): Promise<void> {
  const client = getAdminClient()

  const { data: jobs, error } = await client
    .from('background_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    logger.error('fetch jobs failed', { error: error.message })
    return
  }

  if (!jobs || jobs.length === 0) return

  const job = jobs[0] as unknown as BackgroundJob

  logger.info('processing job', { job_id: job.id, job_type: job.job_type, retry_count: job.retry_count })

  await executeJob(job)
}

async function executeJob(job: BackgroundJob): Promise<void> {
  const client = getAdminClient()

  const lockUpdate = {
    status: 'processing',
    started_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    locked_by: `${HOSTNAME}:${process.pid}`,
  }

  const { error: lockError } = await client
    .from('background_jobs')
    .update(lockUpdate)
    .eq('id', job.id)
    .eq('status', 'pending')

  if (lockError) {
    logger.error('lock job failed', { job_id: job.id, error: lockError.message })
    return
  }

  const heartbeatTimer = setInterval(async () => {
    try {
      await client
        .from('background_jobs')
        .update({ heartbeat_at: new Date().toISOString() })
        .eq('id', job.id)
    } catch (err) {
      logger.warn('heartbeat failed', { job_id: job.id, error: String(err) })
    }
  }, HEARTBEAT_INTERVAL_MS)

  let finalStatus: string
  let finalResult: Record<string, unknown> | null = null
  let finalError: string | null = null
  let scheduledAt: string | null = null
  let newRetryCount = job.retry_count

  try {
    const handler = getHandler(job.job_type)
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.job_type}`)
    }

    const startTime = Date.now()
    finalResult = await handler(job)
    const durationMs = Date.now() - startTime

    logger.info('handler completed', {
      job_id: job.id,
      job_type: job.job_type,
      duration_ms: durationMs,
    })

    finalStatus = 'completed'
  } catch (err) {
    finalError = String(err)
    newRetryCount = job.retry_count + 1

    if (newRetryCount < job.max_retries) {
      const nextRun = calculateScheduledAt(newRetryCount)
      scheduledAt = nextRun.toISOString()
      finalStatus = 'pending'

      logger.warn('job failed, will retry', {
        job_id: job.id,
        job_type: job.job_type,
        retry_count: newRetryCount,
        scheduled_at: scheduledAt,
        error: finalError,
      })
    } else {
      finalStatus = 'dead_letter'

      logger.error('job moved to dead_letter', {
        job_id: job.id,
        job_type: job.job_type,
        retry_count: newRetryCount,
        error: finalError,
      })
    }
  }

  clearInterval(heartbeatTimer)

  const statusUpdate: Record<string, unknown> = {
    status: finalStatus,
    heartbeat_at: new Date().toISOString(),
  }

  if (finalStatus === 'completed') {
    statusUpdate.result = finalResult
    statusUpdate.completed_at = new Date().toISOString()
  } else {
    statusUpdate.error = {
      message: finalError,
      timestamp: new Date().toISOString(),
      retry_count: newRetryCount,
    }
    statusUpdate.retry_count = newRetryCount

    if (scheduledAt) {
      statusUpdate.scheduled_at = scheduledAt
    }

    if (finalStatus === 'dead_letter') {
      statusUpdate.completed_at = new Date().toISOString()
    }
  }

  const { error: updateError } = await client
    .from('background_jobs')
    .update(statusUpdate)
    .eq('id', job.id)

  if (updateError) {
    logger.error('status update failed', {
      job_id: job.id,
      status: finalStatus,
      error: updateError.message,
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
