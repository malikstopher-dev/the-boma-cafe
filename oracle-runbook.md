# Oracle Runbook — Background Job Worker on Oracle Cloud Always Free

This runbook deploys the Boma Cafe background-job worker (Phase 7 of the booking system) on an Oracle Cloud Always Free VM. The worker is a standalone Node.js process that polls the `background_jobs` table in Supabase and processes `pdf_generation` jobs (PDF + email). Without it, every booking successfully queues a job that nothing processes — customers and admins never receive their PDFs or emails.

**Time to complete:** ~30 minutes
**Cost:** $0 (within Always Free limits)
**Prerequisites:** Oracle Cloud account (card required for identity verification, no charge within free limits)

---

## 1. Provision the Always Free VM

### 1.1 Choose a region with Ampere capacity

Oracle's Always Free tier includes **4 OCPUs / 24 GB RAM** of Ampere A1 Compute (ARM). Some regions are at capacity; pick one that shows "Active" for VM.Standard.A1.Flex:

- Recommended: **US West (Phoenix)**, **US East (Ashburn)**, **APAC (Tokyo, Mumbai, Singapore)**
- Avoid regions showing "Out of Capacity" for A1.Flex

### 1.2 Create the instance

In the Oracle Cloud Console:

1. **Navigation menu** → **Compute** → **Instances** → **Create Instance**
2. Name: `boma-worker`
3. Image: **Canonical Ubuntu 22.04** (click "Change image" if it's not Ubuntu)
4. Shape: **VM.Standard.A1.Flex** (click "Change shape" → Ampere)
   - OCPUs: **2** (of 4 free)
   - Memory: **12 GB** (of 24 free)
   - Leave 2 OCPUs / 12 GB for future scale-out or a second instance
5. Networking: leave defaults (new VCN + public subnet) — note the **public IP** it assigns
6. SSH keys: **Save private key** (download the `.key` file) + save the public key shown. Secure the private key — you can't download it again.
7. Click **Create**

Boot takes 2–3 minutes. Note the **Public IP** shown on the instance detail page.

### 1.3 Open inbound port for SSH (optional but recommended)

Default Oracle security list only allows SSH (port 22). The worker only needs outbound HTTPS (443) to Supabase/Resend — no inbound ports are required for the worker itself. Skip this step unless you want to add monitoring later.

---

## 2. SSH into the VM

From the machine holding the private key:

```bash
# Linux / macOS / Windows PowerShell
ssh -i <path-to-private-key> -o StrictHostKeyChecking=no ubuntu@<PUBLIC-IP>
```

If you see `Permission denied (publickey)`, the key permissions are too open:

```bash
chmod 600 <path-to-private-key>
```

---

## 3. Install Node.js 20 (one-liner)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
sudo apt-get install -y nodejs git && \
node --version && npm --version
```

Expected output: `v20.x.x` and `npm 10.x.x`.

---

## 4. Clone the repo and build the worker

```bash
cd ~ && \
git clone https://github.com/malikstopher-dev/the-boma-cafe.git boma && \
cd boma && \
npm ci && \
npm run build:worker && \
ls -lh dist/jobs/index.js
```

Expected: `dist/jobs/index.js` exists (~94 KB; the worker bundle per `tsup.config.ts`).

---

## 5. Create the environment file

Create `~/boma/.env.worker` with these values (copy from your `.env.local`):

```bash
cat > ~/boma/.env.worker << 'EOF'
# Supabase (paste your real values from .env.local — never commit these)
NEXT_PUBLIC_SUPABASE_URL=https://lyksqvqtiysjttwpgeyw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-from-.env.local>

# Resend (for email sends in the worker)
RESEND_API_KEY=<paste-from-.env.local>
BOOKING_FROM_EMAIL=bookings@stopher-malik.co.za
BOOKING_FROM_NAME=The Boma Café
BOOKING_REPLY_TO=info@stopher-malik.co.za

# Worker identity (used for job locking + scheduler dedup)
HOSTNAME=boma-worker-oracle

# Optional: tighten logging (production)
NODE_ENV=production
EOF

chmod 600 ~/boma/.env.worker
```

**Why `NEXT_PUBLIC_SUPABASE_URL`:** the worker bundles `src/lib/supabase.ts` which reads `process.env.NEXT_PUBLIC_SUPABASE_URL` (with `!` non-null assertion). Despite the `NEXT_PUBLIC_` prefix convention, this env var is read server-side by the worker — there is no client-side exposure. Set it to the same value as in `.env.local`.

**Required vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `BOOKING_FROM_EMAIL`, `HOSTNAME`. Others are optional (`BOOKING_FROM_NAME`, `BOOKING_REPLY_TO` fall back gracefully).

---

## 6. Smoke test (foreground, one job)

Run the worker once in the foreground to confirm it boots and processes:

```bash
cd ~/boma && \
set -a; source .env.worker; set +a && \
node dist/jobs/index.js
```

Expected log output (JSON, one line per event):

```
{"level":"info","message":"background jobs worker starting",...}
{"level":"info","message":"worker starting",...}
{"level":"info","message":"scheduler starting",...}
{"level":"info","message":"processing job",...,"job_type":"pdf_generation",...}
{"level":"info","message":"pdf handler started",...}
{"level":"info","message":"pdf generated and stored",...}
{"level":"info","message":"customer email sent",...}
{"level":"info","message":"admin notifications sent and recorded",...}
{"level":"info","message":"handler completed",...}
```

If you see "fetch jobs failed" with `Invalid API key`, the `SUPABASE_SERVICE_ROLE_KEY` is wrong. If you see "No handler registered", pull the latest `main` — the registry is in `src/jobs/index.ts`.

Let it drain the existing pending jobs (you'll see 1 process per pending job at 5s intervals). Once the queue is empty, **Ctrl+C** to exit and set up the persistent service.

---

## 7. Install PM2 and run as a service

PM2 keeps the worker alive across reboots and crashes, with automatic restart.

```bash
sudo npm install -g pm2 && \
cd ~/boma && \
pm2 start dist/jobs/index.js --name boma-worker --env-file .env.worker && \
pm2 save && \
pm2 startup systemd
```

PM2 will print a command starting with `sudo env PATH=$PATH:... pm2 startup ...` — **copy and run that exact command** to install the systemd unit so PM2 starts on boot.

Verify:

```bash
pm2 status           # shows "boma-worker" online, 0 restarts
pm2 logs boma-worker # tail the worker logs (Ctrl+C to exit)
```

Expected: `online`, the worker polling every 5s, scheduler every 30s.

### 7.1 PM2 cheat sheet

```bash
pm2 status                    # check liveness + uptime + restart count
pm2 logs boma-worker --lines 100  # last 100 log lines
pm2 restart boma-worker       # manual restart after code/deploys
pm2 stop boma-worker          # stop the worker (jobs queue indefinitely)
pm2 delete boma-worker        # remove from PM2 (keep code on disk)
pm2 monit                     # top-like live view of CPU/memory/logs
```

A high `restart` count without a deploy = investigate `pm2 logs` for crashes. Repeated crashes suggest OOM, full disk, or a handler exception not caught by the worker loop.

---

## 8. Deploy updates

When you push to `main` and want the worker to use the new code:

```bash
cd ~/boma && \
git pull && \
npm ci && \
npm run build:worker && \
pm2 restart boma-worker
```

If a migration was applied to the DB (e.g. migration 060 was re-applied for the `42702` fix), the worker picks up the new schema automatically — no worker-side action needed beyond the restart.

---

## 9. Verify production end-to-end

On the live site (`https://the-boma-cafe.vercel.app`):

1. **Submit a test booking** as a customer → see the success page with `BMC-2026-NNNN`
2. On the worker (in another SSH session): `pm2 logs boma-worker --lines 50`
3. Watch logs within ≤5s: `processing job`, `pdf handler started`, `pdf generated and stored`, `customer email sent`, `admin notifications sent and recorded`, `handler completed`
4. Check the customer inbox + admin inbox — both should receive one email each
5. Check the `<customer>` booking status — the customer email arrives with the PDF attached

If the customer email doesn't arrive but logs show `customer email sent`:
- Resend accepted the request but the customer's mailbox is bouncing or filtering — check Resend dashboard → Logs
- If `quotation_email_sent_at` is null but logs claim success — the email ACTUALLY sent (Resend confirmed), the `quotes.update` failed silently — re-attempt. The handler is idempotent, so a Retry on the admin background-jobs dashboard will set the timestamp cleanly.

---

## 10. Monitoring and operational checks

### 10.1 Daily health check (one-liner)

```bash
pm2 status | grep boma-worker
```

Expected: `online`, `0` restarts since last deploy. Non-zero restarts = investigate (`pm2 logs`).

### 10.2 Queue backlog check (run anywhere with curl)

```bash
curl -s "https://lyksqvqtiysjttwpgeyw.supabase.co/rest/v1/background_jobs?status=eq.pending&select=id,job_type,created_at&limit=10" \
  -H "apikey: $SUPAKEY" -H "Authorization: Bearer $SUPAKEY" | jq length
```

A persistent backlog > 0 with the worker online = the worker is failing every job. Investigate `pm2 logs` for repeated `error` lines.

### 10.3 Stuck-job check

```bash
curl -s "https://lyksqvqtiysjttwpgeyw.supabase.co/rest/v1/background_jobs?status=eq.processing&select=id,heartbeat_at,locked_by" \
  -H "apikey: $SUPAKEY" -H "Authorization: Bearer $SUPAKEY" | jq .
```

Should be `[]` if the worker is healthy. A stuck row with stale `heartbeat_at` (> 90s old) and the worker online = the worker is mid-handling a long job (expected for big PDFs) OR crashed mid-job (scheduler will reclaim in ~90s).

### 10.4 Dead-letter queue

If `dead_letter` jobs accumulate (visible on `/admin/operations/...` background jobs dashboard once routes are wired, or via `curl` with `status=eq.dead_letter`), check each job's `error` JSONB — it has `message`, `name`, `stack`, `retry_count`. Retry dead-letter jobs from the admin dashboard or via:

```bash
curl -X PATCH "https://lyksqvqtiysjttwpgeyw.supabase.co/rest/v1/rpc" # not exposed — use admin dashboard
```

Manual retry: `/admin/background-jobs/[id] PATCH { action: 'retry' }` resets to `pending`.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Worker exits immediately, `pm2 status` shows "errored" | Missing env var | `cat ~/boma/.env.worker` — confirm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `HOSTNAME` set |
| `fetch jobs failed: Invalid API key` | Wrong service role key | Verify `SUPABASE_SERVICE_ROLE_KEY` matches `.env.local` |
| `No handler registered for job type` | Worker bundle is old | `git pull && npm ci && npm run build:worker && pm2 restart boma-worker` |
| Jobs stuck in `pending` after deploy | Worker not running | `pm2 status` — restart if stopped |
| Jobs stuck in `processing` for 90s+ then reset | Worker crashed mid-job | Check `pm2 logs` for the crash; the scheduler will reclaim and retry up to `max_retries` |
| `error: PDF generation failed — storage path is null` | Supabase Storage bucket missing or misconfigured | Verify the `quotations` bucket exists in Supabase Storage and the service role has access |
| Customer gets no email but `customer email sent` logged | Email landed in spam or Resend rejected | Check Resend dashboard → Logs for that `to: <email>` |
| Admin gets duplicate emails | Phase 3 outbox gate not in effect | Pull `5f753c2` or later; rebuild worker |
| High CPU / `pm2 monit` shows memory climbing | Memory leak in worker loop | `pm2 restart boma-worker` (immediate); open issue — should not happen since the loop doesn't retain per-job state |

---

## 12. Decommission / pause

To pause the worker (queues keep accepting jobs but nothing processes):

```bash
pm2 stop boma-worker
```

To remove the worker completely (VM can be repurposed):

```bash
pm2 delete boma-worker && pm2 save
```

To restore:

```bash
cd ~/boma && git pull && npm ci && npm run build:worker && \
pm2 start dist/jobs/index.js --name boma-worker --env-file .env.worker
```

---

## 13. Cost and limits

- The VM is **Always Free** as long as you stay within: 4 OCPUs / 24 GB RAM total of A1.Flex (we use 2 / 12).
- **Disk:** Always Free includes 200 GB total block storage; the boot volume defaults to ~47 GB which is well within free limits.
- **Outbound data:** 10 TB/month outbound free — the worker only does outbound HTTPS for PDF rendering (Supabase Storage, Resend), well under any practical limit.
- **Idle reclamation:** Oracle reclaims Always Free instances that are idle (low CPU for 7 days). A 5s-poll worker keeps CPU usage non-zero on the polling cycles; reclaim is not a concern, but if you want certainty, schedule a cron job that touches a small file every hour.

---

## Appendix A — Quick deploy (single bash block)

Once SSH'd in and the private key works, this block does steps 3–7 in one shot:

```bash
# Install Node + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && \
sudo apt-get install -y nodejs git && sudo npm install -g pm2 && \
# Clone + build
cd ~ && git clone https://github.com/malikstopher-dev/the-boma-cafe.git boma && \
cd boma && npm ci && npm run build:worker && \
# Prompt user to create .env.worker (manual — secrets shouldn't be in command history)
echo ">>> Create ~/boma/.env.worker now (see step 5 of oracle-runbook.md), then run:"
echo ">>> cd ~/boma && pm2 start dist/jobs/index.js --name boma-worker --env-file .env.worker && pm2 save && pm2 startup systemd"
```
