'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import { Building2, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear any existing session when landing on login
  useEffect(() => {
    localStorage.removeItem('vms_access_token');
    localStorage.removeItem('vms_user');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });

      if (data.success) {
        // Store tokens and user info as expected by axios interceptor and Sidebar
        localStorage.setItem('vms_access_token', data.data.accessToken);
        localStorage.setItem('vms_user', JSON.stringify(data.data.user));

        toast.success('Login successful! Redirecting...');
        
        // Short delay to let the user see the success message
        setTimeout(() => {
          router.push('/invoices/pending');
        }, 800);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid credentials or server error.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950 items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-500/20">
            <Building2 className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
            VMS Enterprise
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 font-medium">
            Authorized Personnel Access Only
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-8 shadow-xl shadow-gray-200/50 dark:shadow-none">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                Corporate Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-zinc-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 ml-1">
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  Security Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-zinc-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Dummy Credentials Helper */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-center mb-4">
              Demo Environments Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 text-[10px]">
                <span className="block font-bold text-gray-700 dark:text-zinc-300">Case Manager</span>
                <code className="text-indigo-600 dark:text-indigo-400">cm@vms.com</code>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 text-[10px]">
                <span className="block font-bold text-gray-700 dark:text-zinc-300">Finance Head</span>
                <code className="text-indigo-600 dark:text-indigo-400">fh@vms.com</code>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 text-center mt-3">
              Password for all accounts is <code className="font-bold">password123</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-xs text-gray-400 dark:text-zinc-500">
          &copy; 2026 VMS Enterprise. All rights reserved.
        </p>
      </div>
    </div>
  );
}
