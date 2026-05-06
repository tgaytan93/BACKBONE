import Link from 'next/link';
import Image from 'next/image';
import { signOut } from './actions';

export default function AdminNav({ email }: { email: string }) {
  return (
    <nav className="border-b border-white/10 px-6 md:px-12 py-4 flex justify-between items-center bg-black/90 backdrop-blur sticky top-0 z-50">
      <Link href="/admin" className="flex items-center gap-3 group">
        <Image
          src="/backbone-lockup-white.png"
          alt="Backbone"
          width={140}
          height={28}
          priority
          className="h-7 w-auto"
        />
        <span className="text-xs tracking-[0.3em] font-mono text-white/60 group-hover:text-cyan-400 transition border-l border-white/20 pl-3">
          / ADMIN
        </span>
      </Link>
      <div className="flex items-center gap-5">
        <span className="hidden md:inline text-xs tracking-widest font-mono text-white/50">
          {email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs tracking-widest font-mono text-white/70 hover:text-cyan-400 transition"
          >
            SIGN OUT
          </button>
        </form>
      </div>
    </nav>
  );
}
