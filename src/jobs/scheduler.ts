import { getAdminClient } from '../lib/supabase'
import { logger } from './utils/logger'
import { calculateScheduledAt } from './utils/retry'

const STUCK_THRESHOLD_MS = 60000
const CHECK_INTERVAL_MS = 30000
const MAX_STUCK_RETRIES = 5

let shutdownRequested = false

export function requestSchedulerShutdown(): void {
  shutdownRequested = true
}

export async function startScheduler(): Promise<void> {
  logger.info('scheduler starting')

  while (!shutdownRequested) {
    try {
      await checkStuckJobs()
    } catch (err) {
      logger.error('scheduler error', { error: String(err) })
    }

    if (!shutdownRequested) {
      await sleep(CHECK_INTERVAL_MS)
    }
  }

  logger.info('scheduler stopped')
}

async function checkStuckJobs(): Promise<void> {
  const client = getAdminClient()
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString()

  const { data: stuckJobs, error } = await client
    .from('background_jobs')
    .select('*')
    .eq('status', 'processing')
    .lt('heartbeat_at', cutoff)

  if (error) {
    logger.error('stuck jobs query failed', { error: error.message })
    return
  }

  if (!stuckJobs || stuckJobs.length === 0) return

  logger.info('stuck jobs detected', { count: stuckJobs.length })

  for (const job of stuckJobs) {
    try {
      await resolveStuckJob(job)
    } catch (err) {
      logger.error('failed to resolve stuck job', {
        job_id: job.id,
        error: String(err),
      })
    }
  }
}

async function resolveStuckJob(job: any): Promise<void> {
  const client = getAdminClient()

  const newRetryCount = (job.retry_count || 0) + 1
  // Never retry a job more times than the job itself asked for
  // (job.max_retries) — the queue's own retry contract wins, the scheduler
  // only rescues stuck 'processing' rows, it does not extend a job's lifetime.
  const effectiveMax = Math.min(MAX_STUCK_RETRIES, job.max_retries || 0)

  if (newRetryCount < effectiveMax) {
    const nextRun = calculateScheduledAt(newRetryCount)

    const { error: updateError } = await client
      .from('background_jobs')
      .update({
        status: 'pending',
        retry_count: newRetryCount,
        scheduled_at: nextRun.toISOString(),
        heartbeat_at: new Date().toISOString(),
        error: {
          message: 'Job stuck in processing state — reset by scheduler',
          previous_heartbeat: job.heartbeat_at,
          timestamp: new Date().toISOString(),
          retry_count: newRetryCount,
        },
      })
      .eq('id', job.id)

    if (updateError) {
      logger.error('failed to reset stuck job', {
        job_id: job.id,
        error: updateError.message,
      })
      return
    }

    logger.info('stuck job reset to pending', {
      job_id: job.id,
      job_type: job.job_type,
      retry_count: newRetryCount,
      scheduled_at: nextRun.toISOString(),
    })
  } else {
    const { error: updateError } = await client
      .from('background_jobs')
      .update({
        status: 'dead_letter',
        completed_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        error: {
          message: 'Job stuck in processing state after max retries — moved to dead_letter',
          previous_heartbeat: job.heartbeat_at,
          timestamp: new Date().toISOString(),
        },
      })
      .eq('id', job.id)

    if (updateError) {
      logger.error('failed to dead_letter stuck job', {
        job_id: job.id,
        error: updateError.message,
      })
      return
    }

    logger.info('stuck job moved to dead_letter', {
      job_id: job.id,
      job_type: job.job_type,
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
