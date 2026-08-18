'use client';

// components/layout/Navbar.tsx
import React from 'react';
import { Menu, Shield, User, LogOut } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import type { AuthUser } from '@/lib/types';

interface NavbarProps {
  user: AuthUser;
  onMenuClick: () => void;
  onLogout: () => void;
}

export default function Navbar({ user, onMenuClick, onLogout }: NavbarProps) {
  const isAdmin = user.role === 'admin';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 shadow-sm flex items-center px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Logo (visible on mobile only) */}
      <div className="lg:hidden flex items-center gap-2">
        <Logo size="sm" />
        <span className="text-sm font-bold text-slate-800">NAND ENTERPRISE</span>
      </div>

      <div className="flex-1" />

      {/* Role badge */}
      <div className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        ${isAdmin ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}
      `}>
        {isAdmin
          ? <Shield size={12} />
          : <User size={12} />
        }
        {isAdmin ? 'Admin' : 'Employee'}
      </div>

      {/* User info */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {user.username.charAt(0)}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 leading-none">{user.username}</p>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{user.role}</p>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
        aria-label="Logout"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline font-medium">Logout</span>
      </button>
    </header>
  );
}
