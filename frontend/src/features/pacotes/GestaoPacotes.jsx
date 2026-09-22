import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  FileDown,
  Loader2,
  Package,
  Upload,
  X,
} from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';

const GRUPOS = [
  { id: 'seg_qua', titulo: 'Segunda / Quarta' },
  { id: 'ter_qui', titulo: 'Terça / Quinta' },
  { id: 'sabado', titulo: 'Sábado' },
];

function formatarDataIso(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function classeStatus(status) {
  if (status === 'Atrasado') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300';
  }
  if (status === 'Em dia') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  if (status === 'Adiantado') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
}

function rotuloStatus(aluno) {
  if (!aluno.status) return aluno.aviso ? 'Sem cálculo' : '—';
  if (aluno.status === 'Atrasado') return `Atrasado · déficit ${aluno.diferenca}`;
  if (aluno.status === 'Adiantado') return `Adiantado · ${Math.abs(aluno.diferenca)}`;
  return 'Em dia';
}

function celulaOuTraco(valor) {
  return valor === null || valor === undefined || valor === '' ? '—' : valor;
}

async function mensagemErroBlob(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (typeof parsed?.detail === 'string') return parsed.detail;
    } catch {
      /* resposta não era JSON */
    }
  }
  return apiErrorMessage(err, fallback);
}

function TabelaAlunos({ alunos }) {
  if (!alunos.length) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Nenhum aluno neste grupo.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-950/40 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Aluno</th>
            <th className="px-4 py-3 font-semibold">Educador</th>
            <th className="px-4 py-3 font-semibold">Dias Agendamento</th>
            <th className="px-4 py-3 font-semibold">Qtd Realizada</th>
            <th className="px-4 py-3 font-semibold">Previsto no Mês</th>
            <th className="px-4 py-3 font-semibold">Previsto Até Hoje</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {alunos.map((aluno, indice) => (
            <tr key={`${aluno.nome}-${aluno.educador || ''}-${indice}`} className="align-top">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{aluno.nome}</td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {celulaOuTraco(aluno.educador)}
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {celulaOuTraco(aluno.dias_agendamento)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                {aluno.qtd_realizada}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                {celulaOuTraco(aluno.total_previsto_mes)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                {celulaOuTraco(aluno.previsto_ate_hoje)}
              </td>
              <td className="px-4 py-3">
                <span className={`badge ${classeStatus(aluno.status)}`}>{rotuloStatus(aluno)}</span>
                {aluno.aviso ? (
                  <p className="mt-1 max-w-xs text-xs text-amber-700 dark:text-amber-300">{aluno.aviso}</p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GestaoPacotes() {
  const [arquivo, setArquivo] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [carregandoUpload, setCarregandoUpload] = useState(false);
  const [carregandoPdf, setCarregandoPdf] = useState(false);
  const [erro, setErro] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  const limpar = () => {
    setArquivo(null);
    setRelatorio(null);
    setErro('');
    setInputKey((k) => k + 1);
  };

  const processarArquivo = async (file) => {
    if (!file) return;
    const nome = file.name.toLowerCase();
    if (!nome.endsWith('.xlsx') && !nome.endsWith('.xls')) {
      setErro('Envie um arquivo Excel válido (.xls ou .xlsx).');
      return;
    }

    setArquivo(file);
    setRelatorio(null);
    setErro('');
    setCarregandoUpload(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/pacotes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRelatorio(data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao processar a planilha.'));
      setRelatorio(null);
    } finally {
      setCarregandoUpload(false);
    }
  };

  const handleFileChange = (e) => {
    processarArquivo(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (carregandoUpload || carregandoPdf) return;
    processarArquivo(e.dataTransfer.files?.[0]);
  };

  const exportarPdf = async () => {
    if (!relatorio) return;
    setCarregandoPdf(true);
    setErro('');
    try {
      const { data } = await api.post('/pacotes/exportar-pdf', relatorio, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio-gestao-pacotes.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(await mensagemErroBlob(err, 'Erro ao gerar o PDF.'));
    } finally {
      setCarregandoPdf(false);
    }
  };

  const dropzoneAtiva = !carregandoUpload && !carregandoPdf;
  const feriados = relatorio?.feriados_aplicados || [];
  const avisos = relatorio?.avisos || [];
  const naoAgrupados = relatorio?.nao_agrupados || [];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Package size={22} className="text-navy-600 dark:text-navy-300" />
            Gestão de Pacotes
          </h2>
          <p className="page-subtitle mt-1">
            Envie a planilha de agendamentos (.xls ou .xlsx) para comparar aulas previstas até hoje
            com o realizado. O resultado não é salvo no cadastro de alunos.
          </p>
        </div>
        {arquivo && !carregandoUpload ? (
          <button type="button" onClick={limpar} className="btn-secondary sm:w-auto">
            <X size={16} />
            Escolher outra planilha
          </button>
        ) : null}
      </div>

      {erro ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (dropzoneAtiva) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        className={`dropzone ${
          arrastando
            ? 'border-navy-500 bg-navy-50/80 shadow-md dark:border-navy-400 dark:bg-navy-950/40'
            : dropzoneAtiva
              ? 'cursor-pointer border-slate-300 bg-white/70 shadow-sm hover:border-navy-400 hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-navy-500'
              : 'cursor-not-allowed border-slate-200 bg-slate-50/60 opacity-60 dark:border-slate-800 dark:bg-slate-950/40'
        }`}
      >
        <input
          key={inputKey}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={!dropzoneAtiva}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-800 text-white shadow-md dark:bg-navy-600">
          {carregandoUpload ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {carregandoUpload
            ? 'Processando planilha...'
            : arquivo
              ? arquivo.name
              : 'Arraste a planilha aqui ou clique para selecionar'}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Formatos suportados: Excel (.xls, .xlsx) — colunas Aluno, Qtd Agendamento e Dias
          Agendamento
        </p>
      </div>

      {relatorio ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>{relatorio.total_alunos}</strong> aluno(s) · referência{' '}
                {String(relatorio.dia_atual).padStart(2, '0')}/
                {String(relatorio.mes).padStart(2, '0')}/{relatorio.ano} · previsto até hoje = floor
                (previsto no mês × {relatorio.dia_atual}/{relatorio.dias_totais_mes})
              </p>
              <div className="flex flex-wrap items-start gap-3">
                <button
                  type="button"
                  onClick={exportarPdf}
                  disabled={carregandoPdf}
                  className="btn-primary sm:w-auto"
                >
                  {carregandoPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  {carregandoPdf ? 'Gerando PDF...' : 'Exportar PDF'}
                </button>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CalendarDays size={16} className="mt-0.5 shrink-0 text-navy-600 dark:text-navy-300" />
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      Feriados neste mês (sem aula)
                    </p>
                    {feriados.length ? (
                      <ul className="mt-1 space-y-0.5 text-slate-500 dark:text-slate-400">
                        {feriados.map((feriado) => (
                          <li key={feriado.data}>
                            {formatarDataIso(feriado.data)} — {feriado.nome}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Nenhum feriado neste mês.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {avisos.length ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {avisos.length} aluno(s) com aviso (permanecem na lista, sem previsto calculado
                  quando a regra não fecha)
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {avisos.map((aviso, indice) => (
                    <li key={`${aviso.nome}-${indice}`}>
                      <strong>{aviso.nome}</strong>
                      {aviso.educador ? ` (${aviso.educador})` : ''}: {aviso.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {GRUPOS.map((grupo) => {
            const alunos = relatorio.grupos?.[grupo.id] || [];
            return (
              <section
                key={grupo.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {grupo.titulo}
                    <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                      {alunos.length} aluno(s)
                    </span>
                  </h3>
                </div>
                <TabelaAlunos alunos={alunos} />
              </section>
            );
          })}

          {naoAgrupados.length ? (
            <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-amber-800 dark:bg-slate-900/80">
              <div className="border-b border-amber-100 px-4 py-3 dark:border-amber-900">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Não classificados
                  <span className="ml-2 font-normal text-amber-700 dark:text-amber-400">
                    {naoAgrupados.length} aluno(s) fora de Seg/Qua, Ter/Qui ou Sábado
                  </span>
                </h3>
              </div>
              <TabelaAlunos alunos={naoAgrupados} />
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
