'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm"> 
        <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to continue.</p>
        <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600">
          The existing auth UI is not present in this workspace, so this page is a lightweight placeholder for the reset-password redirect flow.
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Forgot your password?{' '}
          <Link href="/forgot-password" className="font-medium text-slate-900 hover:underline">
            Request a reset
          </Link>
        </p>
      </div>
    </div>
  );
}
