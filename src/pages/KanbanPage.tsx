import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Plus, Trash2, X, Save, GripVertical,
  CheckSquare, Square, MessageSquare,
  FileText, ChevronDown, ChevronRight, Hash, Upload, Camera, Tag, Edit2,
  Calendar, User, Clock,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  supabase, type KanbanColumn, type KanbanCard,
  type SprintPBI, type PBI, type KanbanCardTask, type PBIAttachment, type Sprint, type Profile,
} from '../lib/supabase';

interface KanbanPageProps {
  sprintId: string;
  boardId: string;
  onBack: () => void;
}

type RichCard = KanbanCard & { sprint_pbis?: { pbis: PBI } | null };

/* ─── PBI Color System ─── */
const PBI_PALETTE = [
  { bg: '#3B82F6', light: '#DBEAFE', text: '#ffffff', textLight: '#1E40AF', border: '#93C5FD' }, // blue
  { bg: '#10B981', light: '#D1FAE5', text: '#ffffff', textLight: '#065F46', border: '#6EE7B7' }, // emerald
  { bg: '#F97316', light: '#FFEDD5', text: '#ffffff', textLight: '#9A3412', border: '#FDBA74' }, // orange
  { bg: '#EF4444', light: '#FEE2E2', text: '#ffffff', textLight: '#991B1B', border: '#FCA5A5' }, // red
  { bg: '#06B6D4', light: '#CFFAFE', text: '#ffffff', textLight: '#0E7490', border: '#67E8F9' }, // cyan
  { bg: '#F59E0B', light: '#FEF3C7', text: '#000000', textLight: '#92400E', border: '#FCD34D' }, // amber
  { bg: '#EC4899', light: '#FCE7F3', text: '#ffffff', textLight: '#9D174D', border: '#F9A8D4' }, // pink
  { bg: '#14B8A6', light: '#CCFBF1', text: '#ffffff', textLight: '#134E4A', border: '#5EEAD4' }, // teal
  { bg: '#84CC16', light: '#ECFCCB', text: '#000000', textLight: '#3F6212', border: '#BEF264' }, // lime
  { bg: '#0284C7', light: '#E0F2FE', text: '#ffffff', textLight: '#0C4A6E', border: '#7DD3FC' }, // sky
  { bg: '#16A34A', light: '#DCFCE7', text: '#ffffff', textLight: '#14532D', border: '#86EFAC' }, // green
  { bg: '#EAB308', light: '#FEF9C3', text: '#000000', textLight: '#713F12', border: '#FDE047' }, // yellow
] as const;

function getPbiColor(pbiId: string) {
  let h = 0;
  for (let i = 0; i < pbiId.length; i++) h = (h * 31 + pbiId.charCodeAt(i)) >>> 0;
  return PBI_PALETTE[h % PBI_PALETTE.length];
}

/* ─── Card Detail Modal ─── */
function CardDetailModal({
  card, sprintPbis, columns, profiles, onClose, onUpdate, onDelete,
}: {
  card: RichCard;
  sprintPbis: (SprintPBI & { pbis: PBI })[];
  columns: KanbanColumn[];
  profiles: Profile[];
  onClose: () => void;
  onUpdate: (id: string, title: string, description: string, sprintPbiId?: string, completedAt?: string | null, assignedTo?: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [sprintPbiId, setSprintPbiId] = useState(card.sprint_pbi_id || '');
  const [completedAt, setCompletedAt] = useState(card.completed_at ? card.completed_at.slice(0, 10) : '');
  const [assignedTo, setAssignedTo] = useState(card.assigned_to || '');
  const [tasks, setTasks] = useState<KanbanCardTask[]>([]);
  const [attachments, setAttachments] = useState<PBIAttachment[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [showTasks, setShowTasks] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTasks(); fetchAttachments(); }, [card.id]);

  async function fetchTasks() {
    const { data } = await supabase.from('kanban_card_tasks').select('*').eq('card_id', card.id).order('created_at', { ascending: true });
    if (data) setTasks(data as KanbanCardTask[]);
  }

  async function fetchAttachments() {
    const { data } = await supabase.from('pbi_attachments').select('*').eq('card_id', card.id).order('created_at', { ascending: true });
    if (data) setAttachments(data as PBIAttachment[]);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskInput.trim()) return;
    await supabase.from('kanban_card_tasks').insert({ card_id: card.id, title: taskInput });
    setTaskInput('');
    fetchTasks();
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await supabase.from('kanban_card_tasks').update({ completed: !completed }).eq('id', taskId);
    fetchTasks();
  }

  async function deleteTask(taskId: string) {
    await supabase.from('kanban_card_tasks').delete().eq('id', taskId);
    fetchTasks();
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentInput.trim()) return;
    await supabase.from('pbi_attachments').insert({ card_id: card.id, type: 'comment', content: commentInput, user_id: user?.id ?? null });
    setCommentInput('');
    fetchAttachments();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'screenshot') {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await supabase.from('pbi_attachments').insert({ card_id: card.id, type, content: ev.target?.result as string, filename: file.name });
      fetchAttachments();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function deleteAttachment(id: string) {
    await supabase.from('pbi_attachments').delete().eq('id', id);
    fetchAttachments();
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const currentColumn = columns.find((c) => c.id === card.column_id);
  const pbiColor = card.sprint_pbis?.pbis?.id ? getPbiColor(card.sprint_pbis.pbis.id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Colored top bar if card is linked to a PBI */}
        {pbiColor && <div className="h-1.5 w-full" style={{ backgroundColor: pbiColor.bg }} />}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Detalhes do Card</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {currentColumn && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Coluna:</span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    {currentColumn.name}
                  </span>
                </div>
              )}
              {pbiColor && card.sprint_pbis?.pbis && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pbiColor.bg }} />
                  <span className="text-xs font-medium" style={{ color: pbiColor.textLight }}>
                    #{card.sprint_pbis.pbis.code ?? card.sprint_pbis.pbis.id.slice(0, 6).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Metadata row: creation date, completion date, assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Clock size={12} /> Criado em
              </label>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {new Date(card.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Calendar size={12} /> Data de conclusão
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Responsável
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Sem responsável</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PBI Vinculado</label>
            <select value={sprintPbiId} onChange={(e) => setSprintPbiId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Nenhum</option>
              {sprintPbis.map((sp) => (
                <option key={sp.id} value={sp.id}>#{sp.pbis.code ?? sp.pbis.id.slice(0, 6).toUpperCase()} — {sp.pbis.title}</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setShowTasks(!showTasks)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Tarefas</span>
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{completedCount}/{tasks.length}</span>
              </div>
              {showTasks ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>
            {showTasks && (
              <div className="p-4 space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 group">
                    <button onClick={() => toggleTask(task.id, task.completed)} className="text-blue-600 hover:text-blue-700 shrink-0">
                      {task.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <span className={`text-sm flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <form onSubmit={addTask} className="flex items-center gap-2 pt-2">
                  <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="Nova tarefa..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                    <Plus size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setShowAttachments(!showAttachments)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">Anexos & Comentários</span>
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{attachments.length}</span>
              </div>
              {showAttachments ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>
            {showAttachments && (
              <div className="p-4 space-y-3">
                {attachments.map((att) => (
                  <div key={att.id} className="bg-slate-50 rounded-lg p-3 group">
                    {att.type === 'comment' && (
                      <div className="flex items-start gap-2">
                        <MessageSquare size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 flex-1">{att.content}</p>
                      </div>
                    )}
                    {att.type === 'screenshot' && att.content && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Image size={14} className="text-emerald-500" />
                          <span className="text-xs font-medium text-slate-600">Screenshot</span>
                        </div>
                        <img src={att.content} alt="screenshot" className="rounded-lg max-h-48 object-contain border border-slate-200" />
                      </div>
                    )}
                    {att.type === 'file' && (
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-amber-500" />
                        <span className="text-sm text-slate-700">{att.filename || 'Arquivo'}</span>
                      </div>
                    )}
                    <button onClick={() => deleteAttachment(att.id)}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      Excluir
                    </button>
                  </div>
                ))}
                <form onSubmit={addComment} className="flex items-center gap-2">
                  <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Adicionar comentário..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                    <MessageSquare size={14} />
                  </button>
                </form>
                <div className="flex items-center gap-2 pt-1">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'screenshot')} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                    <Upload size={12} /> Arquivo
                  </button>
                  <button onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                    <Camera size={12} /> Screenshot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={() => { onDelete(card.id); onClose(); }}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
            <Trash2 size={14} /> Excluir Card
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button onClick={() => { onUpdate(card.id, title, description, sprintPbiId || undefined, completedAt || null, assignedTo || null); onClose(); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Save size={14} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PBI Edit Modal ─── */
const PBI_PRIORITIES = [
  { key: 'low', label: 'Baixa' },
  { key: 'medium', label: 'Média' },
  { key: 'high', label: 'Alta' },
  { key: 'critical', label: 'Crítica' },
];
const SPRINT_PBI_STATUSES = [
  { key: 'todo', label: 'A Fazer' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'done', label: 'Concluído' },
];

function PBIEditModal({
  sprintPbi, onClose, onSaved,
}: {
  sprintPbi: SprintPBI & { pbis: PBI };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(sprintPbi.pbis.title);
  const [description, setDescription] = useState(sprintPbi.pbis.description || '');
  const [priority, setPriority] = useState(sprintPbi.pbis.priority);
  const [storyPoints, setStoryPoints] = useState(sprintPbi.pbis.story_points?.toString() || '');
  const [status, setStatus] = useState(sprintPbi.status);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await Promise.all([
      supabase.from('pbis').update({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        story_points: storyPoints ? parseInt(storyPoints) : null,
      }).eq('id', sprintPbi.pbis.id),
      supabase.from('sprint_pbis').update({ status }).eq('id', sprintPbi.id),
    ]);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Editar PBI</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
              <input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {PBI_PRIORITIES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Story Points</label>
                <input type="number" min="1" value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <div className="flex items-center gap-2">
                {SPRINT_PBI_STATUSES.map((s) => (
                  <button key={s.key} type="button" onClick={() => setStatus(s.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${
                      status === s.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button type="button" onClick={onClose}
              className="text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── PBI info column (not draggable) ─── */
function PBIColumn({ sprintPbis, onAddCard, onPbiUpdated }: {
  sprintPbis: (SprintPBI & { pbis: PBI })[];
  onAddCard: (columnId: string, title: string, sprintPbiId?: string) => void;
  onPbiUpdated: () => void;
}) {
  const [expandedPbi, setExpandedPbi] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [editingPbi, setEditingPbi] = useState<(SprintPBI & { pbis: PBI }) | null>(null);
  const [changingStatusFor, setChangingStatusFor] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    todo: 'A Fazer', in_progress: 'Em Andamento', done: 'Concluído',
  };

  async function handleStatusChange(sprintPbiId: string, newStatus: string) {
    await supabase.from('sprint_pbis').update({ status: newStatus }).eq('id', sprintPbiId);
    setChangingStatusFor(null);
    onPbiUpdated();
  }

  return (
    <div className="w-72 shrink-0 bg-gradient-to-b from-blue-50 to-slate-50 rounded-xl p-3 flex flex-col max-h-full border-2 border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Hash size={16} className="text-blue-600" />
        <h4 className="text-sm font-semibold text-slate-700">PBIs da Sprint</h4>
        <span className="text-xs text-slate-400 bg-blue-100 px-1.5 py-0.5 rounded-full">{sprintPbis.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[80px]">
        {sprintPbis.map((sp) => {
          const color = getPbiColor(sp.pbis.id);
          return (
          <div key={sp.id} className="rounded-lg overflow-hidden shadow-sm" style={{ border: `1.5px solid ${color.border}` }}>
            {/* Color header band */}
            <div className="px-3 py-2 flex items-center gap-2 flex-wrap" style={{ backgroundColor: color.bg }}>
              <span className="text-[10px] font-mono px-1 py-0.5 rounded font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.15)', color: color.text }}>
                #{sp.pbis.code ?? sp.pbis.id.slice(0, 6).toUpperCase()}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.15)', color: color.text }}>
                {PBI_PRIORITIES.find((p) => p.key === sp.pbis.priority)?.label ?? sp.pbis.priority}
              </span>
              {sp.pbis.story_points && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.15)', color: color.text }}>
                  {sp.pbis.story_points} SP
                </span>
              )}
              {/* Edit button */}
              <button
                onClick={() => setEditingPbi(sp)}
                className="ml-auto p-1 rounded transition-opacity hover:opacity-70"
                style={{ backgroundColor: 'rgba(0,0,0,0.15)', color: color.text }}
                title="Editar PBI"
              >
                <Edit2 size={11} />
              </button>
            </div>
            {/* Card body */}
            <div className="px-3 py-2" style={{ backgroundColor: color.light }}>
              <p className="text-sm font-semibold leading-snug" style={{ color: color.textLight }}>{sp.pbis.title}</p>
              {sp.pbis.description && <p className="text-xs mt-1 line-clamp-2 opacity-70" style={{ color: color.textLight }}>{sp.pbis.description}</p>}
              <div className="flex items-center justify-between mt-2 gap-2">
                {/* Clickable status badge */}
                <div className="relative">
                  {changingStatusFor === sp.id ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {SPRINT_PBI_STATUSES.map((s) => (
                        <button key={s.key} onClick={() => handleStatusChange(sp.id, s.key)}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors ${
                            sp.status === s.key
                              ? 'border-current opacity-100'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ borderColor: color.bg, color: color.textLight, backgroundColor: sp.status === s.key ? color.border : 'transparent' }}>
                          {s.label}
                        </button>
                      ))}
                      <button onClick={() => setChangingStatusFor(null)}
                        className="text-[10px] px-1 py-0.5 rounded opacity-50 hover:opacity-100 transition-opacity" style={{ color: color.textLight }}>
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setChangingStatusFor(sp.id)}
                      className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ backgroundColor: color.border, color: color.textLight }}
                      title="Alterar status"
                    >
                      {statusLabels[sp.status] || sp.status}
                      <ChevronDown size={9} />
                    </button>
                  )}
                </div>
                <button onClick={() => setExpandedPbi(expandedPbi === sp.id ? null : sp.id)}
                  className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70 shrink-0" style={{ color: color.textLight }}>
                  {expandedPbi === sp.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {expandedPbi === sp.id ? 'Cancelar' : 'Criar Card'}
                </button>
              </div>
              {expandedPbi === sp.id && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!cardTitle.trim()) return;
                  onAddCard('__pbi_placeholder__', cardTitle, sp.id);
                  setCardTitle(''); setCardDesc(''); setExpandedPbi(null);
                }} className="mt-2 space-y-2">
                  <input autoFocus placeholder="Título do card" value={cardTitle} onChange={(e) => setCardTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  <textarea placeholder="Descrição (opcional)" value={cardDesc} onChange={(e) => setCardDesc(e.target.value)} rows={2}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  <div className="flex items-center gap-2">
                    <button type="submit" className="bg-white text-xs font-semibold px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{ color: color.textLight, border: `1px solid ${color.border}` }}>
                      Criar Card
                    </button>
                    <button type="button" onClick={() => setExpandedPbi(null)}
                      className="text-xs font-medium px-2 py-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity" style={{ color: color.textLight }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          );
        })}
        {sprintPbis.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs bg-white/50 rounded-lg border border-dashed border-blue-200">
            Nenhum PBI nesta sprint.
          </div>
        )}
      </div>

      {/* PBI Edit Modal */}
      {editingPbi && (
        <PBIEditModal
          sprintPbi={editingPbi}
          onClose={() => setEditingPbi(null)}
          onSaved={onPbiUpdated}
        />
      )}
    </div>
  );
}

/* ─── Draggable Card ─── */
function DraggableCard({ card, profiles, onOpen }: { card: RichCard; profiles: Profile[]; onOpen: (card: RichCard) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const pbiId = card.sprint_pbis?.pbis?.id;
  const color = pbiId ? getPbiColor(pbiId) : null;
  const assignee = card.assigned_to ? profiles.find((p) => p.id === card.assigned_to) : null;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        ...(color ? {
          backgroundColor: color.light,
          borderLeft: `4px solid ${color.bg}`,
          borderTop: `1px solid ${color.border}`,
          borderRight: `1px solid ${color.border}`,
          borderBottom: `1px solid ${color.border}`,
        } : {}),
      }}
      className="rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-none bg-white border border-slate-200"
      onDoubleClick={() => onOpen(card)}
      title="Duplo clique para abrir detalhes"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="shrink-0 mt-0.5" style={{ color: color ? color.bg : '#CBD5E1' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: color ? color.textLight : '#1E293B' }}>{card.title}</p>
          {card.description && (
            <p className="text-xs mt-1 line-clamp-2 opacity-70" style={{ color: color ? color.textLight : '#64748B' }}>{card.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {color && pbiId && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.bg }} />
                <span className="text-[10px] font-medium" style={{ color: color.textLight }}>
                  #{card.sprint_pbis?.pbis?.code ?? pbiId.slice(0, 6).toUpperCase()}
                </span>
              </div>
            )}
            {assignee && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                  {(assignee.full_name ?? assignee.email).charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                  {assignee.full_name ?? assignee.email.split('@')[0]}
                </span>
              </div>
            )}
            {card.completed_at && (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                ✓ {new Date(card.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Column drop zone (empty columns need their own droppable) ─── */
function ColumnDropZone({ id, isOver }: { id: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[80px] rounded-lg border-2 border-dashed flex items-center justify-center text-xs transition-colors ${
      isOver ? 'border-blue-400 bg-blue-50 text-blue-500' : 'border-slate-300 bg-white/50 text-slate-400'
    }`}>
      {isOver ? 'Soltar aqui' : 'Sem cards'}
    </div>
  );
}

/* ─── Kanban Column ─── */
function KanbanColumnComponent({ column, cards, sprintPbis, profiles, isDraggingCard, isOver, onAddCard, onDeleteColumn, onRenameColumn, onOpenCard }: {
  column: KanbanColumn;
  cards: RichCard[];
  sprintPbis: (SprintPBI & { pbis: PBI })[];
  profiles: Profile[];
  isDraggingCard: boolean;
  isOver: boolean;
  onAddCard: (columnId: string, title: string, sprintPbiId?: string) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, newName: string) => void;
  onUpdateCard: (cardId: string, title: string, description: string, sprintPbiId?: string) => void;
  onOpenCard: (card: RichCard) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const [selectedPbiId, setSelectedPbiId] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(column.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setNameInput(column.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function commitRename() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== column.name) {
      onRenameColumn(column.id, trimmed);
    }
    setEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setEditingName(false); setNameInput(column.name); }
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="w-72 shrink-0 flex flex-col max-h-full"
    >
      <div className={`rounded-xl p-3 flex flex-col flex-1 transition-colors duration-150 ${isOver && isDraggingCard ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-slate-100'}`}>
        {/* Column header — drag handle for column reordering */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 touch-none shrink-0">
              <GripVertical size={16} />
            </div>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleNameKeyDown}
                className="flex-1 text-sm font-semibold text-slate-700 bg-white border border-blue-400 rounded-md px-2 py-0.5 focus:ring-2 focus:ring-blue-500 outline-none min-w-0"
              />
            ) : (
              <button
                onDoubleClick={startEditing}
                onClick={startEditing}
                className="text-sm font-semibold text-slate-700 truncate hover:text-blue-600 transition-colors text-left"
                title="Clique para renomear"
              >
                {column.name}
              </button>
            )}
            {!editingName && column.status_key && (
              <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Tag size={8} /> {column.status_key}
              </span>
            )}
            {!editingName && (
              <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full shrink-0">{cards.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editingName && (
              <button onClick={startEditing} className="p-1 text-slate-300 hover:text-blue-500 transition-colors" title="Renomear coluna">
                <Edit2 size={13} />
              </button>
            )}
            {editingName && (
              <button onClick={commitRename} className="p-1 text-blue-500 hover:text-blue-700 transition-colors" title="Confirmar">
                <Save size={13} />
              </button>
            )}
            <button onClick={() => onDeleteColumn(column.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Excluir coluna">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Cards list */}
        <div className="flex-1">
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {cards.map((card) => (
                <DraggableCard key={card.id} card={card} profiles={profiles} onOpen={onOpenCard} />
              ))}
              {cards.length === 0 && (
                <ColumnDropZone id={`drop-${column.id}`} isOver={isOver && isDraggingCard} />
              )}
            </div>
          </SortableContext>
        </div>

        {/* Add card form */}
        {showAdd ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!cardTitle.trim()) return;
            onAddCard(column.id, cardTitle, selectedPbiId || undefined);
            setCardTitle(''); setSelectedPbiId(''); setShowAdd(false);
          }} className="mt-3 bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <input autoFocus placeholder="Título do card" value={cardTitle} onChange={(e) => setCardTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
            <select value={selectedPbiId} onChange={(e) => setSelectedPbiId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none mb-2">
              <option value="">Vincular a PBI (opcional)</option>
              {sprintPbis.map((sp) => (
                <option key={sp.id} value={sp.id}>#{sp.pbis.code ?? sp.pbis.id.slice(0, 6).toUpperCase()} — {sp.pbis.title}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                Adicionar
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setCardTitle(''); }}
                className="text-slate-500 hover:text-slate-700 px-2 py-1.5 text-xs font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAdd(true)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} /> Adicionar card
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Kanban Page ─── */
export default function KanbanPage({ sprintId, boardId, onBack }: KanbanPageProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<RichCard[]>([]);
  const [sprintPbis, setSprintPbis] = useState<(SprintPBI & { pbis: PBI })[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showColForm, setShowColForm] = useState(false);
  const [colName, setColName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  // Track the column the active card started in (before any optimistic moves)
  const dragSourceColRef = useRef<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<RichCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Collision: prefer pointer-within on column drop zones, fall back to rect-intersection
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const colDropIds = columns.map((c) => `drop-${c.id}`);
    const colHits = pointerWithin({
      ...args,
      droppableContainers: args.droppableContainers.filter((d) => colDropIds.includes(d.id as string)),
    });
    if (colHits.length > 0) return colHits;
    return rectIntersection(args);
  }, [columns]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: colsData }, { data: cardsData }, { data: spData }, { data: sprintData }, { data: profilesData }] = await Promise.all([
      supabase.from('kanban_columns').select('*').eq('board_id', boardId).order('position', { ascending: true }),
      supabase.from('kanban_cards').select('*, sprint_pbis(pbis(*))').eq('board_id', boardId).order('position', { ascending: true }),
      supabase.from('sprint_pbis').select('*, pbis(*)').eq('sprint_id', sprintId),
      supabase.from('sprints').select('*').eq('id', sprintId).single(),
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
    ]);
    if (colsData) setColumns(colsData as KanbanColumn[]);
    if (cardsData) setCards(cardsData as RichCard[]);
    if (spData) setSprintPbis(spData as (SprintPBI & { pbis: PBI })[]);
    if (sprintData) setSprint(sprintData as Sprint);
    if (profilesData) setProfiles(profilesData as Profile[]);
    setLoading(false);
  }, [boardId, sprintId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreateColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!colName.trim()) return;
    await supabase.from('kanban_columns').insert({
      board_id: boardId, name: colName, position: columns.length, status_key: null,
    });
    setColName(''); setShowColForm(false);
    fetchData();
  }

  async function handleDeleteColumn(columnId: string) {
    await supabase.from('kanban_columns').delete().eq('id', columnId);
    fetchData();
  }

  async function handleRenameColumn(columnId: string, newName: string) {
    await supabase.from('kanban_columns').update({ name: newName }).eq('id', columnId);
    setColumns((prev) => prev.map((c) => c.id === columnId ? { ...c, name: newName } : c));
  }

  async function handleAddCard(columnId: string, title: string, sprintPbiId?: string) {
    const targetColumnId = columnId === '__pbi_placeholder__' ? columns[0]?.id : columnId;
    if (!targetColumnId) return;
    const colCards = cards.filter((c) => c.column_id === targetColumnId);
    await supabase.from('kanban_cards').insert({
      board_id: boardId, column_id: targetColumnId, title,
      position: colCards.length, sprint_pbi_id: sprintPbiId || null, description: null,
    });
    fetchData();
  }

  async function handleDeleteCard(cardId: string) {
    await supabase.from('kanban_cards').delete().eq('id', cardId);
    fetchData();
  }

  async function handleUpdateCard(cardId: string, title: string, description: string, sprintPbiId?: string, completedAt?: string | null, assignedTo?: string | null) {
    const card = cards.find((c) => c.id === cardId);
    await supabase.from('kanban_cards').update({
      title,
      description,
      sprint_pbi_id: sprintPbiId || null,
      completed_at: completedAt ?? null,
      assigned_to: assignedTo ?? null,
      column_id: card?.column_id,
    }).eq('id', cardId);
    fetchData();
  }

  // Resolve which column id the `over` pointer belongs to
  function resolveColumnId(overId: string, currentCards: RichCard[]): string | null {
    if (overId.startsWith('drop-')) return overId.replace('drop-', '');
    if (columns.find((c) => c.id === overId)) return overId;
    const overCard = currentCards.find((c) => c.id === overId);
    return overCard?.column_id ?? null;
  }

  function handleDragStart({ active }: DragStartEvent) {
    const id = active.id as string;
    setActiveId(id);
    const card = cards.find((c) => c.id === id);
    dragSourceColRef.current = card ? card.column_id : null;
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return; // dragging a column — skip

    const targetColId = resolveColumnId(over.id as string, cards);
    if (!targetColId || targetColId === activeCard.column_id) return;

    // Optimistically move the card into the target column
    setCards((prev) => {
      const targetCards = prev.filter((c) => c.column_id === targetColId);
      return prev.map((c) =>
        c.id === activeCard.id
          ? { ...c, column_id: targetColId, position: targetCards.length }
          : c
      );
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = active.id as string;
    setActiveId(null);
    const sourceColId = dragSourceColRef.current;
    dragSourceColRef.current = null;

    if (!over) { fetchData(); return; }

    const activeCard = cards.find((c) => c.id === id);

    // ── Column reordering ──
    if (!activeCard) {
      const oldIdx = columns.findIndex((c) => c.id === id);
      const newIdx = columns.findIndex((c) => c.id === (over.id as string));
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(columns, oldIdx, newIdx);
      setColumns(reordered);
      Promise.all(reordered.map((col, i) => supabase.from('kanban_columns').update({ position: i }).eq('id', col.id)));
      return;
    }

    const currentColId = activeCard.column_id; // already updated by onDragOver

    // ── Cross-column drop: persist the optimistic move ──
    if (sourceColId && currentColId !== sourceColId) {
      const colCards = cards.filter((c) => c.column_id === currentColId).sort((a, b) => a.position - b.position);
      const pos = colCards.findIndex((c) => c.id === id);
      supabase.from('kanban_cards').update({ column_id: currentColId, position: pos >= 0 ? pos : colCards.length }).eq('id', id);

      const targetCol = columns.find((c) => c.id === currentColId);
      if (targetCol?.status_key && activeCard.sprint_pbi_id) {
        supabase.from('sprint_pbis').update({ status: targetCol.status_key }).eq('id', activeCard.sprint_pbi_id);
      }
      return;
    }

    // ── Same-column reorder ──
    const targetColId = resolveColumnId(over.id as string, cards);
    const overCard = cards.find((c) => c.id === (over.id as string));
    if (!overCard || overCard.column_id !== currentColId) return;

    const colCards = cards.filter((c) => c.column_id === currentColId).sort((a, b) => a.position - b.position);
    const oldIdx = colCards.findIndex((c) => c.id === id);
    const newIdx = colCards.findIndex((c) => c.id === (over.id as string));
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) { void targetColId; return; }

    const reordered = arrayMove(colCards, oldIdx, newIdx);
    setCards((prev) => [...prev.filter((c) => c.column_id !== currentColId), ...reordered]);
    Promise.all(reordered.map((c, i) => supabase.from('kanban_cards').update({ position: i }).eq('id', c.id)));
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando...</div>;

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;
  const activeColumn = !activeCard && activeId ? columns.find((c) => c.id === activeId) : null;
  const isDraggingCard = !!activeCard;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors shrink-0">
            <ArrowLeft size={16} /> Voltar para Sprint
          </button>
          {sprint && (
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-tight">{sprint.name}</h2>
                {(sprint.start_date || sprint.end_date) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <span className="text-xs text-slate-500">
                      {sprint.start_date ? new Date(sprint.start_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {' '}<span className="text-slate-300">→</span>{' '}
                      {sprint.end_date ? new Date(sprint.end_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    {sprint.start_date && sprint.end_date && (() => {
                      const start = new Date(sprint.start_date);
                      const end = new Date(sprint.end_date);
                      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return days > 0 ? (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-200">
                          {days} dias
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                sprint.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                sprint.status === 'completed' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {sprint.status === 'active' ? 'ATIVA' : sprint.status === 'completed' ? 'CONCLUÍDA' : 'PLANEJAMENTO'}
              </span>
            </div>
          )}
        </div>
        <button onClick={() => setShowColForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0">
          <Plus size={14} /> Nova Coluna
        </button>
      </div>

      {showColForm && (
        <form onSubmit={handleCreateColumn} className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm w-fit">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Coluna</label>
              <input required autoFocus value={colName} onChange={(e) => setColName(e.target.value)}
                placeholder="Ex: Em Progresso"
                className="w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                Criar
              </button>
              <button type="button" onClick={() => { setShowColForm(false); setColName(''); }}
                className="text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-start gap-4 h-full pb-4 min-w-max">
              <PBIColumn sprintPbis={sprintPbis} onAddCard={handleAddCard} onPbiUpdated={fetchData} />
              {columns.map((column) => {
                const colCards = cards.filter((c) => c.column_id === column.id).sort((a, b) => a.position - b.position);
                const isOver = isDraggingCard && !!cards.find((c) => c.id === activeId && c.column_id === column.id);
                return (
                  <KanbanColumnComponent
                    key={column.id}
                    column={column}
                    cards={colCards}
                    sprintPbis={sprintPbis}
                    profiles={profiles}
                    isDraggingCard={isDraggingCard}
                    isOver={isOver}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                    onDeleteColumn={handleDeleteColumn}
                    onRenameColumn={handleRenameColumn}
                    onUpdateCard={handleUpdateCard}
                    onOpenCard={(card) => {
                    const live = cards.find((c) => c.id === card.id) ?? card;
                    setSelectedCard(live);
                  }}
                  />
                );
              })}
              {columns.length === 0 && (
                <div className="w-72 text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                  Nenhuma coluna. Crie uma para começar.
                </div>
              )}
            </div>
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeCard ? (() => {
            const pbiId = activeCard.sprint_pbis?.pbis?.id;
            const color = pbiId ? getPbiColor(pbiId) : null;
            return (
              <div className="rounded-lg p-3 shadow-2xl w-64 rotate-1 cursor-grabbing"
                style={color ? {
                  backgroundColor: color.light,
                  borderLeft: `4px solid ${color.bg}`,
                  border: `1.5px solid ${color.border}`,
                  borderLeftWidth: '4px',
                } : { backgroundColor: 'white', border: '2px solid #93C5FD' }}>
                <div className="flex items-start gap-2">
                  <GripVertical size={14} className="shrink-0 mt-0.5" style={{ color: color ? color.bg : '#CBD5E1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: color ? color.textLight : '#1E293B' }}>{activeCard.title}</p>
                    {activeCard.description && <p className="text-xs mt-1 line-clamp-2 opacity-70" style={{ color: color ? color.textLight : '#64748B' }}>{activeCard.description}</p>}
                  </div>
                </div>
              </div>
            );
          })() : activeColumn ? (
            <div className="bg-slate-200 rounded-xl p-3 shadow-xl w-64 opacity-80">
              <p className="text-sm font-semibold text-slate-700">{activeColumn.name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          sprintPbis={sprintPbis}
          columns={columns}
          profiles={profiles}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}
    </div>
  );
}
