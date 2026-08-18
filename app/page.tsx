// app/page.tsx
// Root page — redirects based on session
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth/session';

export default async function RootPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect('/login');
  }

  if (session.mustChangePw) {
    redirect('/change-password');
  }

  if (session.role === 'admin') {
    redirect('/admin');
  }

  redirect('/employee');
}
