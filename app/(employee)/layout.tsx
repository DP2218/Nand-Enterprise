// app/(employee)/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();

  if (!session) redirect('/login');
  if (session.role !== 'employee') redirect('/admin');

  return <AppShell role="employee">{children}</AppShell>;
}
