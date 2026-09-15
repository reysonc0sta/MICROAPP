import React, { useState } from 'react';
import {
  AlertCircle,
  ClipboardList,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';

function rotulo(valor) {
  const texto = String(valor || '').trim();
  return texto || 'não identificada';
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

export function RelatorioProvas() {
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
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErro('Envie um arquivo Excel válido (.xlsx).');
      return;
    }

    setArquivo(file);
    setRelatorio(null);
    setErro('');
    setCarregandoUpload(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/provas/upload', formData, {
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
      const { data } = await api.post('/provas/exportar-pdf', relatorio, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio-pos-prova.pdf';
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
  const alunos = relatorio?.alunos || [];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <ClipboardList size={22} className="text-navy-600 dark:text-navy-300" />
            Provas
          </h2>
          <p className="page-subtitle mt-1">
            Envie o Histórico de Contratos (.xlsx) para extrair as ocorrências de Pós prova. O
            resultado não é salvo no cadastro de alunos.
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
          accept=".xlsx"
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
          Formato suportado: Excel (.xlsx) — colunas Aluno, Ocorrência e Descrição
        </p>
      </div>

      {relatorio ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <FileSpreadsheet size={16} className="text-navy-600 dark:text-navy-300" />
              <span>
                <strong>{relatorio.total_alunos}</strong> aluno(s) ·{' '}
                <strong>{relatorio.total_ocorrencias}</strong> ocorrência(s) de Pós prova
              </span>
            </div>
            <button
              type="button"
              onClick={exportarPdf}
              disabled={carregandoPdf}
              className="btn-primary sm:w-auto"
            >
              {carregandoPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              {carregandoPdf ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-950/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Matéria</th>
                  <th className="px-4 py-3 font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {alunos.map((aluno) => {
                  const provas = aluno.provas?.length
                    ? aluno.provas
                    : [{ materia: null, nota_exibicao: null }];
                  return provas.map((prova, indice) => (
                    <tr key={`${aluno.nome}-${indice}`} className="align-top">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {indice === 0 ? aluno.nome : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {rotulo(prova.materia)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {rotulo(prova.nota_exibicao)}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
