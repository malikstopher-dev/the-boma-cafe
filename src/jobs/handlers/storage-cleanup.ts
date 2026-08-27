import { getAdminClient } from '../../lib/supabase'
import type { BackgroundJob } from '../types'
import { logger } from '../utils/logger'

export async function storageCleanupHandler(job: BackgroundJob): Promise<Record<string, unknown>> {
  const payload = job.payload as { bucket?: string; path?: string }
  if (!payload.bucket || !payload.path) throw new Error('storage_cleanup: bucket and path are required')
  if (!['menu-images', 'staff-media', 'boma-images'].includes(payload.bucket)) {
    throw new Error(`storage_cleanup: unsupported bucket ${payload.bucket}`)
  }

  const { error } = await getAdminClient().storage.from(payload.bucket).remove([payload.path])
  if (error) throw new Error(`storage_cleanup: ${error.message}`)
  logger.info('storage cleanup completed', { job_id: job.id, bucket: payload.bucket, path: payload.path })
  return { bucket: payload.bucket, path: payload.path, removed: true }
}
