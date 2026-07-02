'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-4rem)] bg-gray-950 text-white flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, session, status } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(redirect);
    }
  }, [redirect, router, session, status]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        fullName,
        email,
        phone: phone || undefined,
        password,
      });
      router.replace(redirect);
    } catch (err) {
      setError((err as Error).message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-950 text-white flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">TicketBox Account</p>
          <h1 className="mt-2 text-2xl font-extrabold">Đăng ký khán giả</h1>
          <p className="mt-2 text-sm text-gray-400">Tạo tài khoản để mua vé, giữ order và nhận e-ticket sau thanh toán.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-400">Họ tên</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-400">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-400">Số điện thoại</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-400">Mật khẩu</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Tạo tài khoản
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          Đã có tài khoản?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-indigo-400 hover:text-indigo-300">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
