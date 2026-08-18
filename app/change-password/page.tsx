'use client';

// app/change-password/page.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refetch } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully!');
      reset();
      await refetch();

      setTimeout(() => {
        if (user?.role === 'admin') router.push('/admin');
        else router.push('/employee');
      }, 1500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Lock size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">Change Password</h1>
              {user?.mustChangePw && (
                <p className="text-xs text-amber-600 mt-0.5">
                  You must change your password before continuing.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-5">
              <CheckCircle2 size={15} className="shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              id="currentPassword"
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              leftIcon={<Lock size={15} />}
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              id="newPassword"
              label="New Password"
              type="password"
              placeholder="Minimum 6 characters"
              leftIcon={<Lock size={15} />}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              leftIcon={<Lock size={15} />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Change Password
            </Button>

            {!user?.mustChangePw && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
