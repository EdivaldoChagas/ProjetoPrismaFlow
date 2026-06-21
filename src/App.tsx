import { AuthProvider, useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BacklogPage from './pages/BacklogPage';
import SprintsPage from './pages/SprintsPage';
import SprintDetailPage from './pages/SprintDetailPage';
import KanbanPage from './pages/KanbanPage';
import UsersPage from './pages/UsersPage';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type View = 'backlog' | 'sprints' | 'sprint-detail' | 'kanban' | 'users';

function AppContent() {
  const { session, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('backlog');
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!session) return <LoginPage />;

  const navigate = (view: View, sprintId?: string, boardId?: string) => {
    setCurrentView(view);
    if (sprintId) setSelectedSprintId(sprintId);
    if (boardId) setSelectedBoardId(boardId);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'backlog':
        return <BacklogPage />;
      case 'sprints':
        return <SprintsPage onSprintClick={(id) => navigate('sprint-detail', id)} />;
      case 'sprint-detail':
        return selectedSprintId ? (
          <SprintDetailPage
            sprintId={selectedSprintId}
            onBack={() => navigate('sprints')}
            onOpenKanban={(boardId) => navigate('kanban', selectedSprintId, boardId)}
          />
        ) : null;
      case 'kanban':
        return selectedSprintId && selectedBoardId ? (
          <KanbanPage
            sprintId={selectedSprintId}
            boardId={selectedBoardId}
            onBack={() => navigate('sprint-detail', selectedSprintId)}
          />
        ) : null;
      case 'users':
        return <UsersPage />;
      default:
        return <BacklogPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentView={currentView} onNavigate={navigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
