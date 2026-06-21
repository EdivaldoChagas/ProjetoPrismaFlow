import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layout,
  Calendar,
  Target,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase, type Sprint, type PBI, type SprintPBI, type KanbanBoard } from '../lib/supabase';

interface SprintDetailPageProps {
  sprintId: string;
  onBack: () => void;
  onOpenKanban: (boardId: string) => void;
}

function SortablePbiItem({
  sp,
  onRemove,
}: {
  sp: SprintPBI & { pbis: PBI };
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sp.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  };
  const priorityLabels: Record<string, string> = {
    low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm flex items-center gap-3">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500">
        <GripVertical size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityColors[sp.pbis.priority] || 'bg-slate-100 text-slate-600'}`}>
            {priorityLabels[sp.pbis.priority] ?? sp.pbis.priority}
          </span>
          {sp.pbis.story_points && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
              {sp.pbis.story_points} SP
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{sp.pbis.title}</p>
      </div>
      <button onClick={() => onRemove(sp.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function SprintDetailPage({ sprintId, onBack, onOpenKanban }: SprintDetailPageProps) {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [availablePbis, setAvailablePbis] = useState<PBI[]>([]);
  const [sprintPbis, setSprintPbis] = useState<(SprintPBI & { pbis: PBI })[]>([]);
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPbi, setShowAddPbi] = useState(false);
  const [selectedPbiId, setSelectedPbiId] = useState('');
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [boardName, setBoardName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchData();
  }, [sprintId]);

  async function fetchData() {
    setLoading(true);
    const [{ data: sprintData }, { data: allPbis }, { data: spData }, { data: boardsData }] = await Promise.all([
      supabase.from('sprints').select('*').eq('id', sprintId).single(),
      supabase.from('pbis').select('*').eq('status', 'backlog').order('created_at', { ascending: false }),
      supabase.from('sprint_pbis').select('*, pbis(*)').eq('sprint_id', sprintId).order('created_at', { ascending: true }),
      supabase.from('kanban_boards').select('*').eq('sprint_id', sprintId).order('created_at', { ascending: true }),
    ]);
    if (sprintData) setSprint(sprintData as Sprint);
    if (allPbis) setAvailablePbis(allPbis as PBI[]);
    if (spData) setSprintPbis(spData as (SprintPBI & { pbis: PBI })[]);
    if (boardsData) setBoards(boardsData as KanbanBoard[]);
    setLoading(false);
  }

  async function handleAddPbi() {
    if (!selectedPbiId) return;
    await supabase.from('sprint_pbis').insert({ sprint_id: sprintId, pbi_id: selectedPbiId });
    await supabase.from('pbis').update({ status: 'in_progress' }).eq('id', selectedPbiId);
    setSelectedPbiId('');
    setShowAddPbi(false);
    fetchData();
  }

  async function handleRemovePbi(spId: string, pbiId: string) {
    await supabase.from('sprint_pbis').delete().eq('id', spId);
    await supabase.from('pbis').update({ status: 'backlog' }).eq('id', pbiId);
    fetchData();
  }

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim()) return;
    await supabase.from('kanban_boards').insert({ sprint_id: sprintId, name: boardName });
    setBoardName('');
    setShowBoardForm(false);
    fetchData();
  }

  async function handleDeleteBoard(boardId: string) {
    await supabase.from('kanban_boards').delete().eq('id', boardId);
    fetchData();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sprintPbis.findIndex((sp) => sp.id === active.id);
    const newIndex = sprintPbis.findIndex((sp) => sp.id === over.id);
    setSprintPbis((items) => arrayMove(items, oldIndex, newIndex));
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando...</div>;
  if (!sprint) return <div className="text-center py-12 text-slate-400">Sprint não encontrada.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Voltar para Sprints
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">{sprint.name}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sprint.status === 'active' ? 'bg-green-100 text-green-700' : sprint.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {sprint.status.toUpperCase()}
              </span>
            </div>
            {sprint.goal && (
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Target size={16} className="text-slate-400" />
                <p className="text-sm">{sprint.goal}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar size={14} />
              <span>{sprint.start_date ? new Date(sprint.start_date).toLocaleDateString('pt-BR') : '-'} → {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">PBIs da Sprint</h3>
            <button
              onClick={() => setShowAddPbi(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Adicionar PBI
            </button>
          </div>

          {showAddPbi && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1">Selecionar PBI do Backlog</label>
              <select
                value={selectedPbiId}
                onChange={(e) => setSelectedPbiId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-3"
              >
                <option value="">Selecione...</option>
                {availablePbis.map((pbi) => (
                  <option key={pbi.id} value={pbi.id}>{pbi.title}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button onClick={handleAddPbi} disabled={!selectedPbiId} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Adicionar
                </button>
                <button onClick={() => { setShowAddPbi(false); setSelectedPbiId(''); }} className="text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sprintPbis.map((sp) => sp.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sprintPbis.length === 0 && (
                  <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200 border-dashed">
                    Nenhum PBI nesta sprint. Arraste do backlog ou adicione acima.
                  </div>
                )}
                {sprintPbis.map((sp) => (
                  <SortablePbiItem key={sp.id} sp={sp} onRemove={(id) => handleRemovePbi(id, sp.pbis.id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Quadros Kanban</h3>
            <button
              onClick={() => setShowBoardForm(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Novo Kanban
            </button>
          </div>

          {showBoardForm && (
            <form onSubmit={handleCreateBoard} className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Quadro</label>
              <input
                required
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none mb-3"
              />
              <div className="flex items-center gap-2">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Criar
                </button>
                <button type="button" onClick={() => { setShowBoardForm(false); setBoardName(''); }} className="text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {boards.length === 0 && (
              <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200 border-dashed">
                Nenhum quadro Kanban. Crie um para começar.
              </div>
            )}
            {boards.map((board) => (
              <div key={board.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                    <Layout size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{board.name}</h4>
                    <p className="text-xs text-slate-500">Kanban Board</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenKanban(board.id)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
                  >
                    Abrir
                  </button>
                  <button onClick={() => handleDeleteBoard(board.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
