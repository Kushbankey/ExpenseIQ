'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-6">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 dark:text-green-300 text-xl">✓</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Check your email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              We sent a confirmation link to <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>.
              Click it to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 text-sm text-violet-600 dark:text-violet-300 font-medium hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ExpenseIQ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="bg-white dark:bg-[#131316] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800/80 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-500/10 rounded-xl p-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/40 focus:border-violet-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/40 focus:border-violet-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/40 focus:border-violet-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-600 dark:text-violet-300 font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
