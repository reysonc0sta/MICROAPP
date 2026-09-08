import React, { useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  UserPlus,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  RefreshCw,
  Mail,
  BadgeCheck,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  Trash2,
  X,
  Save,
} from 'lucide-react';

const CARGOS = [
  { value: 'ASSISTENTE', label: 'ASSISTENTE (Envios de WhatsApp / Atendimento)' },
  { value: 'PROFESSOR', label: 'PROFESSOR (Lançamento de Notas / Provas)' },
  { value: 'ANALISTA', label: 'ANALISTA (Métricas e Relatórios)' },
  { value: 'DIRETOR', label: 'DIRETOR (Acesso Total / Gestão)' },
  { value: 'ADM', label: 'ADM (Administrador de TI / Sistema)' },
];

const FORM_VAZIO = {
  nome: '',
  email: '',
  senha: '',
  cargo: 'ASSISTENTE',
};

function badgeCargo(cargo) {
  const mapa = {
    ADM: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-300',
    DIRETOR:
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300',
    ANALISTA:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
    PROFESSOR:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    ASSISTENTE:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
  };
  return mapa[cargo] || mapa.ASSISTENTE;
}

function formatarData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function lerUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null');
  } catch {
    return null;
  }
}

function Modal({ titulo, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {titulo}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CadastroUsuario() {
  const usuarioLogado = useMemo(() => lerUsuarioLogado(), []);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [acaoId, setAcaoId] = useState(null);
  const [modalSenha, setModalSenha] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState(null);

  const carregarUsuarios = async () => {
    setCarregandoLista(true);
    setErroLista('');
    try {
      const { data } = await api.get('/usuarios/');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setErroLista(apiErrorMessage(err, 'Erro ao carregar usuários cadastrados.'));
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro('');
  };

  const iniciarEdicao = (u) => {
    setEditandoId(u.id);
    setForm({
      nome: u.nome || '',
      email: u.email || '',
      senha: '',
      cargo: u.cargo || 'ASSISTENTE',
    });
    setSucesso('');
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSucesso('');
    setErro('');
    setCarregando(true);

    try {
      if (editandoId) {
        await api.patch(`/usuarios/${editandoId}`, {
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          cargo: form.cargo,
        });
        setSucesso(`Perfil de ${form.nome} atualizado com sucesso.`);
        cancelarEdicao();
      } else {
        await api.post('/usuarios/cadastrar', {
          ...form,
          email: form.email.trim().toLowerCase(),
        });
        setSucesso(`Usuário ${form.nome} registrado com sucesso no perfil ${form.cargo}!`);
        setForm(FORM_VAZIO);
      }
      await carregarUsuarios();
    } catch (err) {
      setErro(apiErrorMessage(err, editandoId ? 'Erro ao editar perfil.' : 'Erro ao cadastrar usuário.'));
    } finally {
      setCarregando(false);
    }
  };

  const executarConfirmacao = async () => {
    if (!confirmacao) return;
    const { tipo, usuario } = confirmacao;
    setAcaoId(usuario.id);
    setErro('');
    setSucesso('');
    try {
      if (tipo === 'excluir') {
        await api.delete(`/usuarios/${usuario.id}`);
        setSucesso(`Perfil de ${usuario.nome} excluído.`);
        if (editandoId === usuario.id) cancelarEdicao();
      } else if (tipo === 'toggle') {
        await api.patch(`/usuarios/${usuario.id}/ativo`, { ativo: !usuario.ativo });
        setSucesso(
          usuario.ativo
            ? `Perfil de ${usuario.nome} desativado.`
            : `Perfil de ${usuario.nome} ativado.`
        );
      }
      setConfirmacao(null);
      await carregarUsuarios();
    } catch (err) {
      setErro(apiErrorMessage(err, 'Não foi possível concluir a ação.'));
      setConfirmacao(null);
    } finally {
      setAcaoId(null);
    }
  };

  const salvarNovaSenha = async (e) => {
    e.preventDefault();
    if (!modalSenha) return;
    setAcaoId(modalSenha.id);
    setErro('');
    setSucesso('');
    try {
      await api.post(`/usuarios/${modalSenha.id}/redefinir-senha`, {
        nova_senha: novaSenha,
      });
      setSucesso(`Senha de ${modalSenha.nome} redefinida com sucesso.`);
      setModalSenha(null);
      setNovaSenha('');
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao redefinir senha.'));
    } finally {
      setAcaoId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <UserPlus size={22} className="text-navy-600 dark:text-navy-300" />
          Gestão de Acessos
        </h2>
        <p className="page-subtitle mt-1">
          Cadastre, edite e gerencie permissões, status e senhas dos usuários da instituição.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-4">
          <div className="card xl:sticky xl:top-24">
            <h3 className="mb-4 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {editandoId ? 'Editar perfil' : 'Cadastrar novo acesso'}
            </h3>

            {sucesso ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                {sucesso}
              </div>
            ) : null}

            {erro ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {erro}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  disabled={carregando}
                  className="field"
                  placeholder="Ex: Ana Maria Souza"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={carregando}
                  className="field"
                  placeholder="exemplo@escola.com"
                />
              </div>

              {!editandoId ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Senha
                  </label>
                  <input
                    type="password"
                    name="senha"
                    value={form.senha}
                    onChange={handleChange}
                    required
                    minLength={6}
                    disabled={carregando}
                    className="field"
                    placeholder="******"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nível de Permissão (Cargo)
                </label>
                <select
                  name="cargo"
                  value={form.cargo}
                  onChange={handleChange}
                  disabled={carregando}
                  className="field"
                >
                  {CARGOS.map((cargo) => (
                    <option key={cargo.value} value={cargo.value}>
                      {cargo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="submit" disabled={carregando} className="btn-primary">
                  {carregando ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editandoId ? (
                    <Save size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  {carregando
                    ? editandoId
                      ? 'Salvando...'
                      : 'Cadastrando...'
                    : editandoId
                      ? 'Salvar alterações'
                      : 'Cadastrar e Liberar Permissão'}
                </button>
                {editandoId ? (
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    disabled={carregando}
                    className="btn-secondary"
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </section>

        <section className="xl:col-span-8">
          <div className="card !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  <Users size={16} className="text-slate-500" />
                  Usuários cadastrados
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {carregandoLista ? 'Carregando...' : `${usuarios.length} usuário(s) na instituição`}
                </p>
              </div>
              <button
                type="button"
                onClick={carregarUsuarios}
                disabled={carregandoLista}
                className="btn-secondary sm:w-auto"
              >
                <RefreshCw size={14} className={carregandoLista ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>

            {erroLista ? (
              <div className="m-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {erroLista}
              </div>
            ) : null}

            {carregandoLista ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={18} className="animate-spin" />
                Carregando usuários...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum usuário cadastrado ainda.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold sm:px-6">Nome</th>
                      <th className="px-4 py-3 font-semibold">E-mail</th>
                      <th className="px-4 py-3 font-semibold">Cargo</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Criado em</th>
                      <th className="px-4 py-3 font-semibold sm:px-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usuarios.map((u) => {
                      const ehEu = usuarioLogado?.id === u.id;
                      const ocupado = acaoId === u.id;
                      return (
                        <tr
                          key={u.id}
                          className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900 sm:px-6 dark:text-slate-100">
                            {u.nome}
                            {ehEu ? (
                              <span className="ml-2 text-xs font-normal text-slate-400">(você)</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Mail size={13} className="text-slate-400" />
                              {u.email}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${badgeCargo(u.cargo)}`}>{u.cargo}</span>
                          </td>
                          <td className="px-4 py-3">
                            {u.ativo ? (
                              <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <BadgeCheck size={11} />
                                Ativo
                              </span>
                            ) : (
                              <span className="badge border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {formatarData(u.criado_em)}
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                title="Editar perfil"
                                disabled={ocupado}
                                onClick={() => iniciarEdicao(u)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                title="Redefinir senha"
                                disabled={ocupado}
                                onClick={() => {
                                  setModalSenha(u);
                                  setNovaSenha('');
                                  setErro('');
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <KeyRound size={14} />
                              </button>
                              <button
                                type="button"
                                title={u.ativo ? 'Desativar perfil' : 'Ativar perfil'}
                                disabled={ocupado || ehEu}
                                onClick={() => setConfirmacao({ tipo: 'toggle', usuario: u })}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                {u.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                              <button
                                type="button"
                                title="Excluir perfil"
                                disabled={ocupado || ehEu}
                                onClick={() => setConfirmacao({ tipo: 'excluir', usuario: u })}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                {ocupado ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalSenha ? (
        <Modal
          titulo={`Redefinir senha — ${modalSenha.nome}`}
          onClose={() => {
            if (acaoId) return;
            setModalSenha(null);
            setNovaSenha('');
          }}
        >
          <form onSubmit={salvarNovaSenha} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Defina uma nova senha de acesso para <strong>{modalSenha.email}</strong>.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nova senha
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                minLength={6}
                disabled={acaoId === modalSenha.id}
                className="field"
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary sm:w-auto"
                disabled={acaoId === modalSenha.id}
                onClick={() => {
                  setModalSenha(null);
                  setNovaSenha('');
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary sm:w-auto"
                disabled={acaoId === modalSenha.id || novaSenha.length < 6}
              >
                {acaoId === modalSenha.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                Redefinir senha
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmacao ? (
        <Modal
          titulo={
            confirmacao.tipo === 'excluir'
              ? 'Excluir perfil'
              : confirmacao.usuario.ativo
                ? 'Desativar perfil'
                : 'Ativar perfil'
          }
          onClose={() => {
            if (acaoId) return;
            setConfirmacao(null);
          }}
        >
          <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
            {confirmacao.tipo === 'excluir' ? (
              <>
                Tem certeza que deseja excluir permanentemente o perfil de{' '}
                <strong>{confirmacao.usuario.nome}</strong>? Esta ação não pode ser desfeita.
              </>
            ) : confirmacao.usuario.ativo ? (
              <>
                Desativar <strong>{confirmacao.usuario.nome}</strong>? A pessoa não conseguirá entrar no
                sistema até ser reativada.
              </>
            ) : (
              <>
                Ativar novamente o perfil de <strong>{confirmacao.usuario.nome}</strong>?
              </>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary sm:w-auto"
              disabled={!!acaoId}
              onClick={() => setConfirmacao(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary sm:w-auto"
              disabled={!!acaoId}
              onClick={executarConfirmacao}
            >
              {acaoId ? <Loader2 size={16} className="animate-spin" /> : null}
              {confirmacao.tipo === 'excluir'
                ? 'Excluir'
                : confirmacao.usuario.ativo
                  ? 'Desativar'
                  : 'Ativar'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
