import { Bell, Search, LogOut, Crown } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Header() {
  const { profile, signOut } = useAuth();

  const initials = profile
    ? (profile.full_name ?? profile.email).slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-3 py-1.5 w-72">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {profile && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? ''}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-800 leading-none">
                    {profile.full_name ?? profile.email.split('@')[0]}
                  </p>
                  {profile.role === 'admin' && (
                    <Crown size={12} className="text-amber-500" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-none mt-0.5 truncate max-w-[140px]">
                  {profile.email}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sair"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
