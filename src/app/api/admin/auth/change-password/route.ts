import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin/context';
import { getAdminClient } from '@/lib/supabase';
import { hashPassword, verifyPassword } from '@/lib/admin/password';
import { endAllSessionsForAdmin } from '@/lib/admin/session';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(req: NextRequest) {
  const context = await getAdminContext(req);
  if (!context || context.adminId === 'legacy') {
    return NextResponse.json(
      { error: 'Only individual admin accounts can change their own password. Log in with your admin username and password.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { current_password: currentPassword, new_password: newPassword } = body as {
    current_password?: string;
    new_password?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
  }

  const { data: account, error: fetchError } = await getAdminClient()
    .from('admin_accounts')
    .select('id, username, password_hash')
    .eq('id', context.adminId)
    .maybeSingle();

  if (fetchError || !account || !account.password_hash) {
    return NextResponse.json({ error: 'Account not found or has no password set yet.' }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, account.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  const { error: updateError } = await getAdminClient()
    .from('admin_accounts')
    .update({
      password_hash: await hashPassword(newPassword),
      failed_attempts: 0,
      locked_until: null,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id)
    .select('id')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update password. Please try again.' }, { status: 500 });
  }

  await endAllSessionsForAdmin(account.id, 'password_changed', context.sessionId ?? undefined);
  await logAdminAction({
    adminId: account.id,
    adminName: context.displayName,
    adminRole: context.role,
    sessionId: context.sessionId ?? null,
    action: 'admin_accounts.password_change_self',
    targetType: 'admin_accounts',
    targetId: account.id,
    after: { username: account.username },
  });

  return NextResponse.json({ success: true, message: 'Password changed. Other sessions were signed out.' });
}