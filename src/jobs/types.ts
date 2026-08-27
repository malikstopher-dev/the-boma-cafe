export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'dead_letter'

export type JobType =
  | 'pdf_generation'
  | 'order_deduction'
  | 'reservation_lifecycle'
  | 'email_delivery'
  | 'invoice_generation'
  | 'receipt_generation'
  | 'payment_confirmation'
  | 'report_generation'
  | 'notification'
  | 'data_export'
  | 'data_import'

export interface BackgroundJob {
  id: string
  job_type: string
  status: JobStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: Record<string, unknown> | null
  idempotency_key: string | null
  priority: number
  retry_count: number
  max_retries: number
  scheduled_at: string
  heartbeat_at: string | null
  locked_by: string | null
  lease_token: string
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface JobHandler {
  (job: BackgroundJob): Promise<Record<string, unknown>>
}
