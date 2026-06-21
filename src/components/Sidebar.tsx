import { List, Zap, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { PrismaIcon } from './PrismaLogo';

type View = 'backlog' | 'sprints' | 'sprint-detail' | 'kanban' | 'users';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { profile } = useAuth();

  const navItems: { view: View; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { view: 'backlog', label: 'Backlog (PBI)', icon: <List size={20} /> },
    { view: 'sprints', label: 'Sprints', icon: <Zap size={20} /> },
    { view: 'users', label: 'Usuários', icon: <Users size={20} />, adminOnly: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <PrismaIcon size={36} />
        <div>
          <h1 className="text-xl font-bold tracking-tight leading-tight">PRISMA</h1>
          <p className="text-[10px] text-slate-400 leading-tight">Metodologias Ágeis</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && profile?.role !== 'admin') return null;
          const isActive =
            currentView === item.view ||
            (item.view === 'sprints' && (currentView === 'sprint-detail' || currentView === 'kanban'));
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-slate-500 border-t border-slate-800">
        Sprint Manager Prototype
      </div>
    </aside>
  );
}
