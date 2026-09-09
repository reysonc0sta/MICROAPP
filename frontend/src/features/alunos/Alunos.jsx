import React, { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { GraduationCap, AlertCircle, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PerfilAluno } from './PerfilAluno';
import { LancarNotaModal } from './LancarNotaModal';

const CARGOS_LANCAR = ['ADM', 'DIRETOR', 'PROFESSOR'];

export function Alunos({ cargoUsuario }) {
  const [alunos, setAlunos] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [materiasGrade, setMateriasGrade] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [provas, setProvas] = useState([]);
  const [materiaNota, setMateriaNota] = useState(null);
  const [materiaNova, setMateriaNova] = useState('');

  const podeLancar = CARGOS_LANCAR.includes(cargoUsuario);
  const podeGrade = CARGOS_LANCAR.includes(cargoUsuario);

  const carregarAlunos = async (novoOffset = offset) => {
    setCarregando(true);
    setErro('');
    try {
      const { data } = await api.get('/alunos/', { params: { limit, offset: novoOffset } });
      setAlunos(data.items || []);
      setTotal(data.total || 0);
      setOffset(data.offset ?? novoOffset);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao carregar alunos.'));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAlunos(0);
    api.get('/materias/').then(({ data }) => setCatalogo(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const abrirAluno = async (aluno) => {
    setSelecionado(aluno);
    setErro('');
    try {
      const [grade, resultados] = await Promise.all([
        api.get(`/alunos/${aluno.id}/materias`),
        api.get('/provas/', { params: { aluno_id: aluno.id } }),
      ]);
      setMateriasGrade(grade.data || []);
      setProvas(resultados.data || []);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao carregar o perfil do aluno.'));
    }
  };

  const recarregarPerfil = () => {
    if (selecionado) abrirAluno(selecionado);
  };

  const vincularMateria = async (e) => {
    e.preventDefault();
    if (!selecionado || !materiaNova) return;
    try {
      await api.post(`/alunos/${selecionado.id}/materias`, { materia_id: Number(materiaNova) });
      setMateriaNova('');
      recarregarPerfil();
    } catch (err) {
      setErro(apiErrorMessage(err, 'Não foi possível vincular a matéria.'));
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / limit));
  const pagina = Math.floor(offset / limit) + 1;

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <GraduationCap size={22} className="text-navy-600 dark:text-navy-300" />
          Alunos
        </h2>
        <p className="page-subtitle mt-1">Consulte a grade, lance notas e notifique o aluno via WhatsApp.</p>
      </div>

      {erro ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Carregando alunos...
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {alunos.map((aluno) => (
                    <li key={aluno.id}>
                      <button
                        type="button"
                        onClick={() => abrirAluno(aluno)}
                        className={`w-full px-4 py-3 text-left transition ${
                          selecionado?.id === aluno.id
                            ? 'bg-navy-50 dark:bg-navy-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <p className="font-medium text-slate-900 dark:text-slate-100">{aluno.nome}</p>
                        <p className="text-xs text-slate-500">{aluno.turno}</p>
                      </button>
                    </li>
                  ))}
                  {alunos.length === 0 ? (
                    <li className="px-4 py-10 text-center text-sm text-slate-500">Nenhum aluno cadastrado.</li>
                  ) : null}
                </ul>
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">
                    Página {pagina} de {totalPaginas}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={offset <= 0}
                      onClick={() => carregarAlunos(Math.max(0, offset - limit))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={offset + limit >= total}
                      onClick={() => carregarAlunos(offset + limit)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-slate-700"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="xl:col-span-8 space-y-4">
          {selecionado ? (
            <>
              {podeGrade ? (
                <form onSubmit={vincularMateria} className="card flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Adicionar matéria à grade
                    </label>
                    <select value={materiaNova} onChange={(e) => setMateriaNova(e.target.value)} className="field" required>
                      <option value="">Selecione...</option>
                      {catalogo.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary sm:w-auto">
                    <Plus size={16} />
                    Vincular
                  </button>
                </form>
              ) : null}

              <PerfilAluno
                aluno={selecionado}
                materiasGrade={materiasGrade}
                resultadosProvas={provas}
                podeLancar={podeLancar}
                onLancarNota={setMateriaNota}
              />
            </>
          ) : (
            <div className="card text-sm text-slate-500">Selecione um aluno à esquerda para ver o perfil.</div>
          )}
        </section>
      </div>

      {materiaNota && selecionado ? (
        <LancarNotaModal
          aluno={selecionado}
          materia={materiaNota}
          onClose={() => setMateriaNota(null)}
          onSaved={() => {
            setMateriaNota(null);
            recarregarPerfil();
          }}
        />
      ) : null}
    </div>
  );
}
