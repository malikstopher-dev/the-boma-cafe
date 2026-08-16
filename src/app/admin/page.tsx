'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AdminIndex() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    // The Owner lands on the Owner Dashboard whenever they enter /admin.
    // Everyone else (full_manager/manager/assistant_manager) keeps the
    // existing admin landing.
    router.replace(user?.role === 'owner' ? '/dashboard' : '/admin/dashboard');
  }, [router, user, isLoading]);

  return null;
}
