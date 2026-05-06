import Link from 'next/link';
import LoginForm from './login-form';

export const metadata = {
  title: 'Backbone — Admin login',
};

export default function AdminLoginPage() {
  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="border border-white/10 bg-zinc-950 p-8">
          <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">06 — ADMIN</div>
          <h1 className="text-3xl font-black mb-8 leading-tight">Tell me you&apos;re you.</h1>
          <LoginForm />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs tracking-widest font-mono text-white/40 hover:text-cyan-400 transition"
          >
            ← BACK TO SITE
          </Link>
        </div>
      </div>
    </div>
  );
}
