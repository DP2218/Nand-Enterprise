'use client';

// components/layout/Sidebar.tsx
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarCheck,
  FileText, DollarSign, TrendingUp, BarChart3,
  Calendar, FileCheck, CreditCard, Wallet,
  X,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import type { UserRole } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/leave', label: 'Leave Requests', icon: FileText },
  { href: '/salary', label: 'Salary', icon: DollarSign },
  { href: '/advances', label: 'Advances', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const EMPLOYEE_NAV: NavItem[] = [
  { href: '/employee', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-attendance', label: 'My Attendance', icon: Calendar },
  { href: '/my-leave', label: 'My Leave', icon: FileCheck },
  { href: '/my-salary', label: 'My Salary', icon: CreditCard },
  { href: '/my-advances', label: 'My Advances', icon: Wallet },
];

interface SidebarProps {
  role: UserRole;
  onClose?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV;

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/employee') return pathname === href;
    return pathname.startsWith(href);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (onClose) onClose();
    router.push(href);
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">NAND ENTERPRISE</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
              {role === 'admin' ? 'Management Portal v1.0' : 'Employee Portal'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }
              `}
            >
              <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
