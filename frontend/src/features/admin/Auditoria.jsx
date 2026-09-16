import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  ScrollText,
} from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';

const PAGE_SIZE = 20;

const ENTIDADES = [
  { value: '', label: 'Todas as entidades' },
  { value: 'aluno', label: 'Aluno' },
  { value: 'nota', label: 'Nota' },
  { value: 'materia', label: 'Matéria' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'mensagem_whatsapp', label: 'Mensagem WhatsApp' },
  { value: 'prova', label: 'Prova (upload)' },
  { value: 'whatsapp', label: 'WhatsApp (disparo)' },
];

function rotuloEntidade(valor) {
  return ENTIDADES.find((item) => item.value === valor)?.label || valor || '—';
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function parseValor(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

function DetalheUpload({ valorNovo }) {
  const dados = parseValor(valorNovo) || {};
  const nomeArquivo = dados.nome_arquivo || '—';
  const sha256 = dados.sha256 || '';
  const shaCurto = sha256 ? `${sha256.slice(0, 12)}…` : '—';

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>
        <span className="font-medium text-slate-500 dark:text-slate-400">Arquivo: </span>
        {nomeArquivo}
      </p>
      {dados.turno ? (
        <p>
          <span className="font-medium text-slate-500 dark:text-slate-400">Turno: </span>
          {dados.turno}
        </p>
      ) : null}
      <p>
        <span className="font-medium text-slate-500 dark:text-slate-400">SHA-256: </span>
        <span title={sha256 || undefined} className="font-mono text-xs">
          {shaCurto}
        </span>
      </p>
    </div>
  );
}

const FILTROS_VAZIOS = {
  usuario_id: '',
  entidade: '',
  data_inicio: '',
  data_fim: '',
};

export function Auditoria() {
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [expandidoId, setExpandidoId] = useState(null);

  const carregar = async (pagina = page, filtrosAtivos = aplicados) => {
    setCarregando(true);
    setErro('');
    try {
      const params = { page: pagina, page_size: PAGE_SIZE };
      if (filtrosAtivos.usuario_id) params.usuario_id = Number(filtrosAtivos.usuario_id);
      if (filtrosAtivos.entidade) params.entidade = filtrosAtivos.entidade;
      if (filtrosAtivos.data_inicio) params.data_inicio = filtrosAtivos.data_inicio;
      if (filtrosAtivos.data_fim) params.data_fim = filtrosAtivos.data_fim;

      const { data } = await api.get('/auditoria/', { params });
      setItens(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || pagina);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao carregar o histórico de auditoria.'));
      setItens([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar(1, aplicados);
    api
      .get('/usuarios/', { params: { limit: 100, offset: 0 } })
      .then(({ data }) => setUsuarios(data.items || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setAplicados(filtros);
    carregar(1, filtros);
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS);
    setAplicados(FILTROS_VAZIOS);
    carregar(1, FILTROS_VAZIOS);
  };

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <ScrollText size={22} className="text-navy-600 dark:text-navy-300" />
          Auditoria
        </h2>
        <p className="page-subtitle mt-1">
          Histórico de criações, edições, exclusões e uploads feitos no sistema.
        </p>
      </div>

      {erro ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      ) : null}

      <form
        onSubmit={aplicarFiltros}
        className="card grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Usuário
          </label>
          <select
            className="field"
            value={filtros.usuario_id}
            onChange={(e) => setFiltros((atual) => ({ ...atual, usuario_id: e.target.value }))}
          >
            <option value="">Todos</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Entidade
          </label>
          <select
            className="field"
            value={filtros.entidade}
            onChange={(e) => setFiltros((atual) => ({ ...atual, entidade: e.target.value }))}
          >
            {ENTIDADES.map((item) => (
              <option key={item.value || 'todas'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Data início
          </label>
          <input
            type="date"
            className="field"
            value={filtros.data_inicio}
            onChange={(e) => setFiltros((atual) => ({ ...atual, data_inicio: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Data fim
          </label>
          <input
            type="date"
            className="field"
            value={filtros.data_fim}
            onChange={(e) => setFiltros((atual) => ({ ...atual, data_fim: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary sm:w-auto">
            <Filter size={16} />
            Filtrar
          </button>
          <button type="button" onClick={limparFiltros} className="btn-secondary sm:w-auto">
            Limpar
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Carregando auditoria...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuário</th>
                    <th className="px-4 py-3 font-semibold">Ação</th>
                    <th className="px-4 py-3 font-semibold">Entidade</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itens.map((log) => {
                    const ehUpload = log.acao === 'UPLOAD';
                    const aberto = expandidoId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {ehUpload ? (
                              <button
                                type="button"
                                onClick={() => setExpandidoId(aberto ? null : log.id)}
                                className="inline-flex items-center gap-1 text-left hover:text-navy-700 dark:hover:text-navy-300"
                                aria-expanded={aberto}
                              >
                                <ChevronDown
                                  size={14}
                                  className={`shrink-0 transition ${aberto ? 'rotate-180' : ''}`}
                                />
                                {log.usuario_nome}
                              </button>
                            ) : (
                              log.usuario_nome
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {log.acao}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {rotuloEntidade(log.entidade)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{log.descricao}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {formatarDataHora(log.data_hora)}
                          </td>
                        </tr>
                        {ehUpload && aberto ? (
                          <tr className="bg-slate-50/80 dark:bg-slate-950/40">
                            <td colSpan={5} className="px-4 py-3 pl-10">
                              <DetalheUpload valorNovo={log.valor_novo} />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                        Nenhum registro de auditoria encontrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Página {page} de {totalPaginas} · {total} registro(s)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => carregar(page - 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPaginas}
                  onClick={() => carregar(page + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
