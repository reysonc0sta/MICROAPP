import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  Copy,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Eraser,
  MessageSquareText,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import {
  CONFIG_PADRAO,
  calcularAcompanhamento,
  formatarMoedaBRL,
  formatarNumero,
  gerarMensagemResponsavel,
} from '../../utils/acompanhamentoModulos';

const estadoInicialAluno = {
  nome: '',
  parcelasPagas: '',
  moduloAtual: '',
  totalModulos: '',
  faltas: '',
};

function paraNumeroCampo(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function classeSituacao(situacao) {
  if (situacao === 'REGULAR') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  if (situacao === 'PENDENTE') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
}

function IconeSituacao({ situacao }) {
  if (situacao === 'REGULAR') return <CheckCircle size={16} className="shrink-0" />;
  if (situacao === 'PENDENTE') return <AlertCircle size={16} className="shrink-0" />;
  return <AlertTriangle size={16} className="shrink-0" />;
}

export function AcompanhamentoModulos() {
  const [aluno, setAluno] = useState(estadoInicialAluno);
  const [mensagem, setMensagem] = useState('');
  const [copiado, setCopiado] = useState(false);

  const resultado = calcularAcompanhamento({
    nome: aluno.nome,
    parcelasPagas: paraNumeroCampo(aluno.parcelasPagas),
    moduloAtual: paraNumeroCampo(aluno.moduloAtual),
    totalModulos: paraNumeroCampo(aluno.totalModulos),
    faltas: paraNumeroCampo(aluno.faltas),
    ...CONFIG_PADRAO,
  });

  const atualizarAluno = (e) => {
    const { name, value } = e.target;
    setAluno((prev) => ({ ...prev, [name]: value }));
    setCopiado(false);
  };

  const limpar = () => {
    setAluno(estadoInicialAluno);
    setMensagem('');
    setCopiado(false);
  };

  const handleGerarMensagem = () => {
    if (!resultado.valido) return;
    setMensagem(gerarMensagemResponsavel(resultado));
    setCopiado(false);
  };

  const handleCopiar = async () => {
    if (!mensagem.trim()) return;
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <BookOpen size={22} className="text-navy-600 dark:text-navy-300" />
            Acompanhamento de Módulos
          </h2>
          <p className="page-subtitle mt-1">
            Calculadora rápida de atendimento. Os dados não são salvos e são perdidos ao atualizar a
            página.
          </p>
        </div>
        <button type="button" onClick={limpar} className="btn-secondary sm:w-auto">
          <Eraser size={16} />
          Limpar
        </button>
      </div>

      {/* Dados + Resultado lado a lado */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <div className="card h-full">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-white dark:bg-navy-600">
                <UserRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  Dados do aluno
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preencha para calcular em tempo real
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nome do aluno
                </label>
                <input
                  type="text"
                  name="nome"
                  value={aluno.nome}
                  onChange={atualizarAluno}
                  className="field"
                  placeholder="Ex: João"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Parcelas pagas
                </label>
                <input
                  type="number"
                  name="parcelasPagas"
                  min={0}
                  step={1}
                  value={aluno.parcelasPagas}
                  onChange={atualizarAluno}
                  className="field"
                  placeholder="Ex: 8"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Módulo atual/concluído
                </label>
                <input
                  type="number"
                  name="moduloAtual"
                  min={0}
                  step={1}
                  value={aluno.moduloAtual}
                  onChange={atualizarAluno}
                  className="field"
                  placeholder="Ex: 2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Total de módulos
                </label>
                <input
                  type="number"
                  name="totalModulos"
                  min={0}
                  step={1}
                  value={aluno.totalModulos}
                  onChange={atualizarAluno}
                  className="field"
                  placeholder="Ex: 6"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Quantidade de faltas
                </label>
                <input
                  type="number"
                  name="faltas"
                  min={0}
                  step={1}
                  value={aluno.faltas}
                  onChange={atualizarAluno}
                  className="field"
                  placeholder="Ex: 12"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7">
          <div className="card flex h-full flex-col">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Calculator size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                    Resultado da análise
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atualiza automaticamente conforme os dados
                  </p>
                </div>
              </div>

              {resultado.valido ? (
                <span
                  className={`badge ${classeSituacao(resultado.situacao)}`}
                >
                  <IconeSituacao situacao={resultado.situacao} />
                  {resultado.situacao}
                </span>
              ) : null}
            </div>

            {!resultado.valido ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>Preencha os campos corretamente para ver o resultado.</span>
                </div>
                {resultado.erros?.length ? (
                  <ul className="w-full list-disc space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 pl-8 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    {resultado.erros.map((erro) => (
                      <li key={erro}>{erro}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <DestaqueMetric
                    rotulo="Valor das reposições"
                    valor={formatarMoedaBRL(resultado.valorReposicoes)}
                    destaque
                  />
                  <DestaqueMetric
                    rotulo="Semanas de reposição"
                    valor={formatarNumero(resultado.semanasReposicao)}
                  />
                  <DestaqueMetric
                    rotulo="Mensalidades extras"
                    valor={
                      resultado.mensalidadesAdicionais !== resultado.mensalidadesAdicionaisCeil
                        ? `${formatarNumero(resultado.mensalidadesAdicionais)} → ${formatarNumero(resultado.mensalidadesAdicionaisCeil)}`
                        : formatarNumero(resultado.mensalidadesAdicionais)
                    }
                  />
                </div>

                <dl className="grid flex-1 gap-2.5 sm:grid-cols-2">
                  <ItemResultado rotulo="Aluno" valor={resultado.nome || '—'} />
                  <ItemResultado rotulo="Parcelas pagas" valor={formatarNumero(resultado.parcelasPagas)} />
                  <ItemResultado rotulo="Módulo atual" valor={formatarNumero(resultado.moduloAtual)} />
                  <ItemResultado
                    rotulo="Módulos pelas parcelas"
                    valor={formatarNumero(resultado.modulosCorrespondentes)}
                  />
                  <ItemResultado
                    rotulo="Diferença"
                    valor={`${formatarNumero(resultado.diferencaModulos)} módulo(s)`}
                  />
                  <ItemResultado rotulo="Faltas" valor={formatarNumero(resultado.faltas)} />
                </dl>

                {resultado.faltas > 0 ? (
                  <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                    {formatarNumero(resultado.faltas)} falta(s) representam aproximadamente{' '}
                    <strong className="text-slate-800 dark:text-slate-100">
                      {formatarNumero(resultado.semanasReposicao)} semana(s)
                    </strong>{' '}
                    de aulas para reposição.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      {resultado.valido ? (
        <>
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              Explicação do cálculo
            </h3>
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200">
              {resultado.explicacao}
            </pre>
          </div>

          <div className="card">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              <MessageSquareText size={16} className="text-navy-600 dark:text-navy-300" />
              Mensagem para o responsável
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Gere o texto automático, edite se precisar e copie para enviar.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleGerarMensagem} className="btn-primary sm:w-auto">
                <RefreshCw size={16} />
                Gerar mensagem
              </button>
              <button
                type="button"
                onClick={handleCopiar}
                disabled={!mensagem.trim()}
                className="btn-secondary sm:w-auto"
              >
                <Copy size={16} />
                Copiar mensagem
              </button>
            </div>

            {copiado ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle size={16} />
                Mensagem copiada!
              </div>
            ) : null}

            <textarea
              value={mensagem}
              onChange={(e) => {
                setMensagem(e.target.value);
                setCopiado(false);
              }}
              rows={12}
              className="field mt-4 resize-y font-mono text-sm"
              placeholder='Clique em "Gerar mensagem" para preencher o texto automático. Depois, edite se precisar.'
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function DestaqueMetric({ rotulo, valor, destaque = false }) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        destaque
          ? 'border-navy-200 bg-navy-50 dark:border-navy-700 dark:bg-navy-950/40'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50'
      }`}
    >
      <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {rotulo}
      </p>
      <p
        className={`mt-1 text-lg font-bold tracking-tight ${
          destaque ? 'text-navy-800 dark:text-navy-200' : 'text-slate-900 dark:text-white'
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function ItemResultado({ rotulo, valor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/60 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-950/40">
      <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{valor}</dd>
    </div>
  );
}
