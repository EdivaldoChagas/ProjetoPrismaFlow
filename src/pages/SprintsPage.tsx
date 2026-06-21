import { useEffect, useState } from 'react';
import { Plus, Calendar, ArrowRight, Trash2, Edit2, Save, X, Target } from 'lucide-react';
import { supabase, type Sprint } from '../lib/supabase';

interface SprintsPageProps {
  onSprintClick: (sprintId: string) => void;
}

const statusColors: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function SprintsPage({ onSprintClick }: SprintsPageProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', goal: '', start_date: '', end_date: '', status: 'planning' });

  useEffect(() => {
    fetchSprints();
  }, []);

  async function fetchSprints() {
    setLoading(true);
    const { data, error } = await supabase.from('sprints').select('*').order('created_at', { ascending: false });
    if (!error && data) setSprints(data as Sprint[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      goal: form.goal || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
    };
    if (editingId) {
      await supabase.from('sprints').update(payload).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('sprints').insert(payload);
    }
    setForm({ name: '', goal: '', start_date: '', end_date: '', status: 'planning' });
    setShowForm(false);
    fetchSprints();
  }

  async function handleDelete(id: string) {
    await supabase.from('sprints').delete().eq('id', id);
    fetchSprints();
  }

  function startEdit(sprint: Sprint) {
    setEditingId(sprint.id);
    setForm({
      name: sprint.name,
      goal: sprint.goal || '',
      start_date: sprint.start_date || '',
      end_date: sprint.end_date || '',
      status: sprint.status,
    });
    setShowForm(true);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sprints</h2>
          <p className="text-slate-500 text-sm mt-1">Crie e gerencie suas sprints</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', goal: '', start_date: '', end_date: '', status: 'planning' }); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nova Sprint
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Goal</label>
              <input
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Save size={16} /> {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <X size={16} /> Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">Nenhuma sprint encontrada.</div>
          )}
          {sprints.map((sprint) => (
            <div key={sprint.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[sprint.status] || 'bg-slate-100 text-slate-600'}`}>
                  {sprint.status.toUpperCase()}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(sprint)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(sprint.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">{sprint.name}</h3>
              {sprint.goal && (
                <div className="flex items-start gap-2 mb-3">
                  <Target size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-500 line-clamp-2">{sprint.goal}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <Calendar size={14} />
                <span>{sprint.start_date ? new Date(sprint.start_date).toLocaleDateString('pt-BR') : '-'} → {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString('pt-BR') : '-'}</span>
              </div>
              <button
                onClick={() => onSprintClick(sprint.id)}
                className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200"
              >
                Gerenciar <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
