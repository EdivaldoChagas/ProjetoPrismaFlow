import { useEffect, useState } from 'react';
import { Users, Mail, Loader2, AlertCircle, CheckCircle, Shield, UserCheck, Trash2, Crown } from 'lucide-react';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function UsersPage() {
  const { profile: myProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email: inviteEmail, redirectTo: window.location.origin }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar convite');
      setInviteSuccess(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      setTimeout(() => setInviteSuccess(null), 5000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function toggleRole(profile: Profile) {
    if (profile.id === myProfile?.id) return;
    const newRole = profile.role === 'admin' ? 'member' : 'admin';
    setRoleLoading(profile.id);
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id);
    setProfiles((prev) => prev.map((p) => p.id === profile.id ? { ...p, role: newRole } : p));
    setRoleLoading(null);
  }

  if (myProfile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
        <p className="text-sm text-slate-500 mt-1">Convide membros da equipe e gerencie permissões.</p>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Convidar novo usuário</h2>
            <p className="text-xs text-slate-500">O usuário receberá um link de convite por e-mail.</p>
          </div>
        </div>

        <form onSubmit={handleInvite} className="flex gap-3">
          <div className="relative flex-1">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              required
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={inviteLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shrink-0"
          >
            {inviteLoading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            Enviar convite
          </button>
        </form>

        {inviteError && (
          <div className="flex items-start gap-2 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{inviteError}</p>
          </div>
        )}
        {inviteSuccess && (
          <div className="flex items-center gap-2 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <CheckCircle size={15} className="text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700">{inviteSuccess}</p>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600">Como funciona o convite</p>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>Informe o e-mail do colaborador e clique em Enviar convite.</li>
            <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>O colaborador recebe um e-mail com link de acesso válido por 24 horas.</li>
            <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>Ao clicar no link, ele define a senha e acessa o sistema. Também pode usar o Google.</li>
          </ul>
        </div>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Users size={18} className="text-slate-600" />
          <h2 className="text-base font-bold text-slate-800">Usuários cadastrados</h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {profiles.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum usuário cadastrado ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">
                      {(p.full_name ?? p.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p.full_name ?? 'Sem nome'}
                    </p>
                    {p.id === myProfile?.id && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">Você</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{p.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    p.role === 'admin'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {p.role === 'admin' ? <Crown size={11} /> : <UserCheck size={11} />}
                    {p.role === 'admin' ? 'Admin' : 'Membro'}
                  </span>
                  {p.id !== myProfile?.id && (
                    <button
                      onClick={() => toggleRole(p)}
                      disabled={roleLoading === p.id}
                      title={p.role === 'admin' ? 'Rebaixar para Membro' : 'Promover a Admin'}
                      className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40 rounded-lg hover:bg-slate-100"
                    >
                      {roleLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
