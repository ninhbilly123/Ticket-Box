'use client';

import Link from 'next/link';
import { LogOut, Ticket, UserCircle } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export default function CustomerHeader() {
  const { session, status, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-900 bg-gray-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-white font-extrabold tracking-tight">
          <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/30">
            <Ticket className="w-5 h-5" />
          </span>
          <span>TicketBox</span>
        </Link>

        <nav className="flex items-center gap-2 text-xs">
          {status === 'loading' ? (
            <span className="h-9 px-3 rounded-lg bg-gray-900 text-gray-500 flex items-center">Đang kiểm tra...</span>
          ) : session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="h-9 px-3 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-200 hover:border-indigo-600 hover:text-white flex items-center gap-2"
              >
                <UserCircle className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline max-w-40 truncate">{session.user.fullName || session.user.email}</span>
                <span className="sm:hidden">Profile</span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="h-9 w-9 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-300 hover:border-red-700 hover:text-red-300 flex items-center justify-center"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="h-9 px-3 rounded-lg border border-gray-800 bg-gray-900/70 text-gray-200 hover:border-indigo-600 hover:text-white flex items-center"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="h-9 px-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 flex items-center"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
