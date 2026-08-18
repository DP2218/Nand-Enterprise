// app/(admin)/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();

  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/employee');
  if (session.mustChangePw) redirect('/change-password');

  return <AppShell role="admin">{children}</AppShell>;
}
