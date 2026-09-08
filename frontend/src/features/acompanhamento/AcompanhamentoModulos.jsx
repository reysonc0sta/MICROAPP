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
  if (situacao === 'REGULAR') return <CheckCircle size={18} className="shrink-0" />;
  if (situacao === 'PENDENTE') return <AlertCircle size={18} className="shrink-0" />;
  return <AlertTriangle size={18} className="shrink-0" />;
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
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="card">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-navy-900 sm:text-xl dark:text-white">
          <BookOpen className="shrink-0 text-navy-600 dark:text-navy-300" />
          Acompanhamento de Módulos
        </h2>
        <p className="text-sm text-navy-500 dark:text-navy-300">
          Calculadora rápida de atendimento. Os dados não são salvos e são perdidos ao atualizar a página.
        </p>
      </div>

      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-navy-900 dark:text-white">Dados do aluno</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
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
            <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
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
            <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
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
            <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
              Total de módulos contratados
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
            <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
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

      {!resultado.valido ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <ul className="list-disc space-y-1 pl-4">
            {resultado.erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-navy-900 dark:text-white">
                <Calculator size={18} className="text-navy-600 dark:text-navy-300" />
                Resultado da análise
              </h3>
              <span
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold ${classeSituacao(resultado.situacao)}`}
              >
                <IconeSituacao situacao={resultado.situacao} />
                Situação: {resultado.situacao}
              </span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <ItemResultado rotulo="Aluno" valor={resultado.nome || '—'} />
              <ItemResultado rotulo="Parcelas pagas" valor={formatarNumero(resultado.parcelasPagas)} />
              <ItemResultado rotulo="Módulo atual" valor={formatarNumero(resultado.moduloAtual)} />
              <ItemResultado
                rotulo="Módulos correspondentes às parcelas"
                valor={formatarNumero(resultado.modulosCorrespondentes)}
              />
              <ItemResultado
                rotulo="Diferença"
                valor={`${formatarNumero(resultado.diferencaModulos)} módulo(s)`}
              />
              <ItemResultado rotulo="Faltas" valor={formatarNumero(resultado.faltas)} />
              <ItemResultado
                rotulo="Semanas para reposição"
                valor={formatarNumero(resultado.semanasReposicao)}
              />
              <ItemResultado
                rotulo="Mensalidades adicionais estimadas"
                valor={
                  resultado.mensalidadesAdicionais !== resultado.mensalidadesAdicionaisCeil
                    ? `${formatarNumero(resultado.mensalidadesAdicionais)} (arredondado: ${formatarNumero(resultado.mensalidadesAdicionaisCeil)})`
                    : formatarNumero(resultado.mensalidadesAdicionais)
                }
              />
              <ItemResultado
                rotulo="Valor das reposições"
                valor={formatarMoedaBRL(resultado.valorReposicoes)}
                destaque
              />
            </dl>

            {resultado.faltas > 0 ? (
              <p className="mt-4 rounded-xl border border-navy-200 bg-navy-50 p-3 text-sm text-navy-700 dark:border-navy-700 dark:bg-navy-900/40 dark:text-navy-200">
                {formatarNumero(resultado.faltas)} falta(s) representam aproximadamente{' '}
                {formatarNumero(resultado.semanasReposicao)} semana(s) de aulas para reposição.
              </p>
            ) : null}

            <p className="mt-3 text-sm font-medium text-navy-800 dark:text-navy-100">
              Valor para repor todas as faltas: {formatarMoedaBRL(resultado.valorReposicoes)}
            </p>
            {resultado.mensalidadesAdicionais > 0 ? (
              <p className="mt-1 text-sm text-navy-600 dark:text-navy-300">
                Extensão estimada: {formatarNumero(resultado.mensalidadesAdicionais)} mensalidade(s)
              </p>
            ) : null}
          </div>

          <div className="card">
            <h3 className="mb-3 text-base font-semibold text-navy-900 dark:text-white">
              Explicação do cálculo
            </h3>
            <pre className="whitespace-pre-wrap rounded-xl border border-navy-200 bg-navy-50 p-4 font-sans text-sm leading-relaxed text-navy-800 dark:border-navy-700 dark:bg-navy-900/40 dark:text-navy-100">
              {resultado.explicacao}
            </pre>
          </div>

          <div className="card">
            <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-navy-900 dark:text-white">
              <MessageSquareText size={18} className="text-navy-600 dark:text-navy-300" />
              Mensagem para o responsável
            </h3>
            <p className="mb-4 text-sm text-navy-500 dark:text-navy-400">
              Use &quot;Gerar mensagem&quot; para montar o texto automático. Você pode editar o conteúdo antes de
              copiar.
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-navy-600 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800"
              >
                <Copy size={16} />
                Copiar mensagem
              </button>
              <button
                type="button"
                onClick={limpar}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-navy-50 sm:w-auto dark:border-navy-600 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800"
              >
                <Eraser size={16} />
                Limpar
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
              rows={14}
              className="field mt-4 resize-y font-mono text-sm"
              placeholder='Clique em "Gerar mensagem" para preencher o texto automático. Depois, edite se precisar.'
            />
          </div>
        </>
      )}

      {resultado.valido ? null : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={limpar}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-navy-50 dark:border-navy-600 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800"
          >
            <Eraser size={16} />
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

function ItemResultado({ rotulo, valor, destaque = false }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-navy-50/80 px-3.5 py-3 dark:border-navy-700 dark:bg-navy-900/50">
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-500 dark:text-navy-400">
        {rotulo}
      </dt>
      <dd
        className={`mt-1 text-sm font-semibold ${
          destaque ? 'text-navy-900 dark:text-white' : 'text-navy-800 dark:text-navy-100'
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
