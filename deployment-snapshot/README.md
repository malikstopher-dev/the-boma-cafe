# Deployment Snapshot — v1.0.0-booking-system

**Date:** July 2026
**Git Tag:** `v1.0.0-booking-system`

This directory contains a complete backup of the system state at the time of the
booking system v1.0 release.

## Contents

| Path | Description |
|------|-------------|
| `database/schema.sql` | Full database schema dump with configuration data (booking types, venue areas, packages, add-ons, settings) |
| `configuration/.env.local.backup` | Full environment configuration (with secrets — store securely) |
| `configuration/.env.sanitized` | Redacted environment config (secrets replaced with `<redacted>`) |

## Restore Instructions

1. **Database:** Restore via Supabase Dashboard → Database → Backups, or run the
   migration SQL files from `supabase/migrations/`.
2. **Environment:** Copy `.env.local.backup` to the project root as `.env.local`.
3. **Code:** Checkout the tagged release: `git checkout v1.0.0-booking-system`.

## Key Credentials

- Supabase Project: `lyksqvqtiysjttwpgeyw`
- Resend API key, Firebase credentials, and admin passwords are in the full `.env` backup.
