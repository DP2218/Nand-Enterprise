// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { comparePassword, hashPassword } from '@/lib/auth/password';
import { getSessionFromRequest, setSessionCookie } from '@/lib/auth/session';
import { signToken } from '@/lib/auth/jwt';
import { changePasswordSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Get current password hash
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('id, password_hash')
      .eq('id', session.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    const { error: updateError } = await supabaseServer
      .from('users')
      .update({ password_hash: newHash, must_change_pw: false })
      .eq('id', session.userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // Issue a fresh token with mustChangePw = false
    const newToken = await signToken({
      userId: session.userId,
      username: session.username,
      role: session.role,
      employeeId: session.employeeId,
      mustChangePw: false,
    });

    const response = NextResponse.json({ message: 'Password changed successfully' });
    setSessionCookie(response, newToken);
    return response;
  } catch (err) {
    console.error('[change-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

