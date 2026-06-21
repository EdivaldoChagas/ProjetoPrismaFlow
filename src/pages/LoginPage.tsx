import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PrismaFullLogo } from '../components/PrismaLogo';

type Tab = 'magic' | 'password';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('magic');

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  // Password state
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // Google state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setMagicError(null);
    setMagicLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err: unknown) {
      setMagicError(err instanceof Error ? err.message : 'Erro ao enviar link');
    } finally {
      setMagicLoading(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha incorretos. Se é seu primeiro acesso, use a aba "Link por E-mail" ou crie uma conta.');
          }
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('Este e-mail já está cadastrado. Faça login ou use "Link por E-mail".');
          }
          throw error;
        }
        setPwSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro, ou use "Link por E-mail" para entrar sem senha.');
      }
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Provider não configurado');
      // browser will redirect — keep loading state
    } catch {
      setGoogleError('Login com Google não está ativado. Use "Link por E-mail" ou crie uma conta com senha.');
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <PrismaFullLogo width={220} />
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold text-white tracking-widest">PRISMA</span>
            <p className="text-[11px] text-slate-400 tracking-wide mt-0.5">
              Plataforma Integrada de Projetos, Sustentação e Metodologias Ágeis
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100">
            <button
              onClick={() => { setTab('magic'); setMagicError(null); setMagicSent(false); }}
              className={`py-4 text-sm font-semibold transition-colors ${
                tab === 'magic' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Link por E-mail
            </button>
            <button
              onClick={() => { setTab('password'); setPwError(null); setPwSuccess(null); }}
              className={`py-4 text-sm font-semibold transition-colors ${
                tab === 'password' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <div className="p-8">
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-4 disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin text-slate-400" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              )}
              Continuar com Google
            </button>

            {googleError && (
              <div className="flex items-start gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">{googleError}</p>
              </div>
            )}

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-400 font-medium">ou</span>
              </div>
            </div>

            {/* Magic link tab */}
            {tab === 'magic' && (
              <>
                {magicSent ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={28} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Link enviado!</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Verifique sua caixa de entrada em <strong>{magicEmail}</strong> e clique no link para entrar.
                      </p>
                    </div>
                    <button
                      onClick={() => { setMagicSent(false); setMagicEmail(''); }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Usar outro e-mail
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Seu e-mail</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          required
                          type="email"
                          value={magicEmail}
                          onChange={(e) => setMagicEmail(e.target.value)}
                          placeholder="voce@empresa.com"
                          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    {magicError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                        <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{magicError}</p>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={magicLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {magicLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Enviar link de acesso
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Sem senha necessária. Funciona para cadastro e login.
                    </p>
                  </form>
                )}
              </>
            )}

            {/* Password tab */}
            {tab === 'password' && (
              <>
                <div className="grid grid-cols-2 gap-1 mb-5 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => { setMode('login'); setPwError(null); setPwSuccess(null); }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                      mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => { setMode('signup'); setPwError(null); setPwSuccess(null); }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                      mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                <form onSubmit={handlePassword} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo</label>
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@empresa.com"
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {pwError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                      <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{pwError}</p>
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <p className="text-sm text-emerald-700">{pwSuccess}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {pwLoading && <Loader2 size={16} className="animate-spin" />}
                    {mode === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Produto desenvolvido pela PRODESP — Gerência da Saúde
        </p>
      </div>
    </div>
  );
}
