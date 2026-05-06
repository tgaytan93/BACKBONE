'use client';

import { useState, useTransition } from 'react';
import { signIn } from './actions';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">EMAIL</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">PASSWORD</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={isPending}
          className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-cyan-400 text-black px-6 py-3 text-sm font-bold tracking-widest inline-flex items-center justify-center gap-2 hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'SIGNING IN...' : 'SIGN IN →'}
      </button>
    </form>
  );
}
