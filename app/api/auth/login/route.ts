// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { comparePassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Check placeholder env
    const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!dbUrl || dbUrl.includes('your-supabase-project')) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured in .env.local' },
        { status: 500 }
      );
    }

    // Find user by username
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, username, password_hash, role, employee_id, must_change_pw')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.error('[login DB query error]', userError);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password — check bcrypt hash first, fallback to plain text comparison
    let isValid = await comparePassword(password, user.password_hash);
    if (!isValid && password === user.password_hash) {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employee_id,
      mustChangePw: user.must_change_pw,
    });

    const response = NextResponse.json({
      data: {
        userId: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employee_id,
        mustChangePw: user.must_change_pw,
      },
      message: 'Login successful',
    });

    setSessionCookie(response, token);
    return response;
  } catch (err: any) {
    console.error('[login]', err);
    if (err?.message?.includes('fetch failed') || err?.message?.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      return NextResponse.json(
        { error: 'Cannot connect to Supabase. Please verify credentials in .env.local' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
