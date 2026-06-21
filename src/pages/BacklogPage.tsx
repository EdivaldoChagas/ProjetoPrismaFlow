import { useEffect, useState, useRef } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, Filter, Check, Pencil, MoreHorizontal,
} from 'lucide-react';
import { supabase, type PBI, type BacklogTab } from '../lib/supabase';

const priorities = ['low', 'medium', 'high', 'critical'];
const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};
const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

type PBIWithStatus = PBI & { latestStatus?: string };

const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const statusLabels: Record<string, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

/* ─── Tab bar item ─── */
function TabItem({
  tab, isActive, count, onSelect, onRename, onDelete, canDelete,
}: {
  tab: BacklogTab;
  isActive: boolean;
  count: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== tab.name) onRename(trimmed);
    else setName(tab.name);
    setEditing(false);
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setName(tab.name);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  return (
    <div
      className="relative flex items-center shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <div className="flex items-center gap-1 px-1 pb-2 border-b-2 border-blue-500">
          <input
            ref={inputRef}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setName(tab.name); setEditing(false); }
            }}
            onBlur={commitRename}
            className="w-28 text-sm font-medium border border-blue-400 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={commitRename} className="p-0.5 text-blue-600 hover:text-blue-800">
            <Check size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={onSelect}
          onDoubleClick={startEdit}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            isActive
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {tab.name}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {count}
          </span>
        </button>
      )}

      {/* Hover actions */}
      {hovered && !editing && (
        <div className="absolute -top-1 right-0 flex items-center gap-0.5 bg-white border border-slate-200 rounded-md shadow-sm px-1 py-0.5 z-10">
          <button
            onClick={startEdit}
            title="Renomear aba"
            className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded"
          >
            <Pencil size={11} />
          </button>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Excluir aba"
              className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function BacklogPage() {
  const [tabs, setTabs] = useState<BacklogTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [pbis, setPbis] = useState<PBIWithStatus[]>([]);
  const [allPbis, setAllPbis] = useState<PBIWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', story_points: '', tab_id: '',
  });
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const newTabInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTabs(); }, []);

  useEffect(() => {
    if (allPbis.length >= 0 && activeTabId !== null) {
      const filtered = allPbis.filter((p) => p.tab_id === activeTabId);
      setPbis(filtered);
    }
  }, [activeTabId, allPbis]);

  async function fetchTabs() {
    const { data } = await supabase.from('backlog_tabs').select('*').order('position', { ascending: true });
    if (data && data.length > 0) {
      setTabs(data as BacklogTab[]);
      setActiveTabId((prev) => prev ?? (data as BacklogTab[])[0].id);
    }
  }

  async function fetchPbis() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pbis')
      .select('*, sprint_pbis(status)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const enriched = (data as (PBI & { sprint_pbis: { status: string }[] })[]).map((pbi) => {
        const statuses = pbi.sprint_pbis ?? [];
        const latestStatus = statuses.length > 0 ? statuses[statuses.length - 1].status : undefined;
        return { ...pbi, latestStatus } as PBIWithStatus;
      });
      setAllPbis(enriched);
    }
    setLoading(false);
  }

  useEffect(() => { fetchPbis(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      story_points: form.story_points ? parseInt(form.story_points) : null,
      tab_id: form.tab_id || activeTabId,
    };
    if (editingId) {
      await supabase.from('pbis').update(payload).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('pbis').insert(payload);
    }
    setForm({ title: '', description: '', priority: 'medium', story_points: '', tab_id: '' });
    setShowForm(false);
    fetchPbis();
  }

  async function handleDelete(id: string) {
    await supabase.from('pbis').delete().eq('id', id);
    fetchPbis();
  }

  function startEdit(pbi: PBIWithStatus) {
    setEditingId(pbi.id);
    setForm({
      title: pbi.title,
      description: pbi.description || '',
      priority: pbi.priority,
      story_points: pbi.story_points?.toString() || '',
      tab_id: pbi.tab_id || activeTabId || '',
    });
    setShowForm(true);
  }

  function openNewForm() {
    setEditingId(null);
    setForm({ title: '', description: '', priority: 'medium', story_points: '', tab_id: activeTabId || '' });
    setShowForm(true);
  }

  // ── Tab CRUD ──

  async function handleAddTab() {
    const trimmed = newTabName.trim();
    if (!trimmed) { setAddingTab(false); return; }
    const position = tabs.length;
    const { data } = await supabase.from('backlog_tabs').insert({ name: trimmed, position }).select().single();
    if (data) {
      await fetchTabs();
      setActiveTabId((data as BacklogTab).id);
    }
    setNewTabName('');
    setAddingTab(false);
  }

  async function handleRenameTab(tabId: string, name: string) {
    await supabase.from('backlog_tabs').update({ name }).eq('id', tabId);
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, name } : t));
  }

  async function handleDeleteTab(tabId: string) {
    if (tabs.length <= 1) return;
    // Move PBIs in this tab to the first remaining tab
    const remaining = tabs.filter((t) => t.id !== tabId);
    const targetTab = remaining[0];
    await supabase.from('pbis').update({ tab_id: targetTab.id }).eq('tab_id', tabId);
    await supabase.from('backlog_tabs').delete().eq('id', tabId);
    // Reorder remaining tabs
    await Promise.all(remaining.map((t, i) => supabase.from('backlog_tabs').update({ position: i }).eq('id', t.id)));
    if (activeTabId === tabId) setActiveTabId(targetTab.id);
    await fetchTabs();
    fetchPbis();
  }

  const filtered = filterPriority === 'all' ? pbis : pbis.filter((p) => p.priority === filterPriority);

  const tabCounts = tabs.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = allPbis.filter((p) => p.tab_id === t.id).length;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Product Backlog</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie os itens do backlog do produto</p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Novo PBI
        </button>
      </div>

      {/* PBI Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">{editingId ? 'Editar PBI' : 'Novo PBI'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
              <input
                required
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>{priorityLabels[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Story Points</label>
              <input
                type="number"
                min="1"
                value={form.story_points}
                onChange={(e) => setForm({ ...form, story_points: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Aba</label>
              <select
                value={form.tab_id || activeTabId || ''}
                onChange={(e) => setForm({ ...form, tab_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Save size={16} /> {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <X size={16} /> Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              count={tabCounts[tab.id] ?? 0}
              onSelect={() => setActiveTabId(tab.id)}
              onRename={(name) => handleRenameTab(tab.id, name)}
              onDelete={() => handleDeleteTab(tab.id)}
              canDelete={tabs.length > 1}
            />
          ))}

          {/* Add tab */}
          {addingTab ? (
            <div className="flex items-center gap-1 px-3 py-2 shrink-0">
              <input
                ref={newTabInputRef}
                autoFocus
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTab();
                  if (e.key === 'Escape') { setAddingTab(false); setNewTabName(''); }
                }}
                onBlur={handleAddTab}
                placeholder="Nome da aba"
                className="w-32 text-sm border border-blue-400 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setAddingTab(true);
                setNewTabName('');
                setTimeout(() => newTabInputRef.current?.focus(), 0);
              }}
              title="Adicionar aba"
              className="flex items-center gap-1 px-3 py-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0 border-b-2 border-transparent"
            >
              <Plus size={15} />
              <span className="text-xs font-medium">Nova aba</span>
            </button>
          )}
        </div>

        {/* Priority filter inside the tab panel */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">Todas as prioridades</option>
            {priorities.map((p) => (
              <option key={p} value={p}>{priorityLabels[p]}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} iten{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* PBI list */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <MoreHorizontal size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum PBI nesta aba.</p>
              <button onClick={openNewForm} className="mt-3 text-xs text-blue-600 hover:underline font-medium">
                Adicionar o primeiro PBI
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pbi) => (
                <div key={pbi.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          #{pbi.code ?? pbi.id.slice(0, 6).toUpperCase()}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColors[pbi.priority] || 'bg-slate-100 text-slate-600'}`}>
                          {priorityLabels[pbi.priority] ?? pbi.priority}
                        </span>
                        {pbi.story_points && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {pbi.story_points} SP
                          </span>
                        )}
                        {pbi.latestStatus && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[pbi.latestStatus] || 'bg-slate-100 text-slate-600'}`}>
                            {statusLabels[pbi.latestStatus] || pbi.latestStatus}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-slate-800">{pbi.title}</h3>
                      {pbi.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{pbi.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(pbi)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(pbi.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
