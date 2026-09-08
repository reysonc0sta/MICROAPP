import React, { useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  WifiOff,
  Users,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

const POR_PAGINA = 10;

function StatusBadge({ status }) {
  const estilos = {
    Pendente:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
    Enviando:
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200',
    Enviado:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    Falha:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300',
  };

  return (
    <span className={`badge ${estilos[status] || estilos.Pendente}`}>
      {status === 'Enviando' ? <Loader2 size={11} className="animate-spin" /> : null}
      {status === 'Enviado' ? <CheckCircle size={11} /> : null}
      {status === 'Falha' ? <PhoneOff size={11} /> : null}
      {status}
    </span>
  );
}

function statusCandidato(candidato, { carregando, disparado }) {
  if (!candidato.valido) return 'Falha';
  if (carregando) return 'Enviando';
  if (disparado) return 'Enviado';
  return 'Pendente';
}

export function ImportarPlanilha({ whatsappConectado, onIrParaConexao }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [pagina, setPagina] = useState(1);

  const limparEstadoArquivo = () => {
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setPagina(1);
    setInputKey((k) => k + 1);
  };

  const carregarPreview = async (file) => {
    setCarregandoPreview(true);
    setErro('');
    setPreview(null);
    setResultado(null);
    setPagina(1);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/whatsapp/preview-planilha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(response.data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao ler a planilha para pré-visualização.'));
      setArquivo(null);
    } finally {
      setCarregandoPreview(false);
    }
  };

  const aceitarArquivo = (file) => {
    if (!whatsappConectado) {
      setErro('Conecte o WhatsApp antes de selecionar uma planilha.');
      return;
    }
    if (!file) return;

    const nome = file.name.toLowerCase();
    if (!nome.endsWith('.xlsx') && !nome.endsWith('.xls')) {
      setErro('Envie apenas arquivos Excel (.xlsx ou .xls).');
      return;
    }

    setArquivo(file);
    setErro('');
    setResultado(null);
    carregarPreview(file);
  };

  const handleFileChange = (e) => {
    aceitarArquivo(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (!whatsappConectado || carregandoPreview || carregando) return;
    aceitarArquivo(e.dataTransfer.files?.[0]);
  };

  const handleEnviar = async () => {
    if (!whatsappConectado) {
      setErro('Você precisa conectar o WhatsApp antes de iniciar os disparos.');
      return;
    }

    if (!arquivo) {
      setErro('Selecione uma planilha .xlsx ou .xls primeiro.');
      return;
    }

    setCarregando(true);
    setErro('');
    setResultado(null);

    try {
      const status = await api.get('/whatsapp/status');
      if (!statusWhatsappConectado(status.data)) {
        setErro('WhatsApp desconectado. Conecte o aparelho pelo QR Code antes de disparar mensagens.');
        return;
      }

      const formData = new FormData();
      formData.append('file', arquivo);

      const response = await api.post('/whatsapp/upload-planilha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(response.data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao processar a planilha.'));
    } finally {
      setCarregando(false);
    }
  };

  const candidatos = preview?.candidatos || [];
  const totalPaginas = Math.max(1, Math.ceil(candidatos.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const paginaAtual = candidatos.slice(inicio, inicio + POR_PAGINA);

  const dropzoneAtiva = whatsappConectado && !carregandoPreview && !carregando;

  return (
    <div className="notranslate w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-navy-600 dark:text-navy-300" />
            Importar Planilha e Disparar
          </h2>
          <p className="page-subtitle mt-1">
            Envie a planilha, revise a prévia em tela cheia e confirme o disparo em massa.
          </p>
        </div>
        {arquivo && !carregando ? (
          <button type="button" onClick={limparEstadoArquivo} className="btn-secondary sm:w-auto">
            <X size={16} />
            Escolher outra planilha
          </button>
        ) : null}
      </div>

      {!whatsappConectado ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <WifiOff size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>WhatsApp desconectado.</strong> Conecte o aparelho pelo QR Code para liberar o
            envio da planilha.{' '}
            {onIrParaConexao ? (
              <button type="button" onClick={onIrParaConexao} className="font-semibold underline">
                Ir para Conectar WhatsApp
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (dropzoneAtiva) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all sm:p-14 ${
          arrastando
            ? 'border-navy-500 bg-navy-50/80 dark:border-navy-400 dark:bg-navy-950/40'
            : dropzoneAtiva
              ? 'cursor-pointer border-slate-300 bg-white/70 hover:border-navy-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-navy-500'
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800 text-white shadow-sm dark:bg-navy-600">
          <Upload size={24} />
        </div>
        <p className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {arquivo ? arquivo.name : 'Arraste a planilha aqui ou clique para selecionar'}
        </p>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Formatos suportados: Excel (.xlsx, .xls)
        </p>
      </div>

      {erro ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{erro}</span>
        </div>
      ) : null}

      {carregandoPreview ? (
        <div className="card flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
          <Loader2 className="animate-spin" size={16} />
          <span>Lendo a planilha para pré-visualização...</span>
        </div>
      ) : null}

      {preview ? (
        <div className="card space-y-4 !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
            <span className="badge border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <Users size={12} />
              {preview.total_linhas} aluno(s) com falta
            </span>
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle size={12} />
              {preview.total_validos} receberão mensagem
            </span>
            {preview.total_invalidos > 0 ? (
              <span className="badge border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <PhoneOff size={12} />
                {preview.total_invalidos} sem telefone válido
              </span>
            ) : null}
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Faltas</th>
                  <th className="px-4 py-3 font-semibold">Telefone</th>
                  <th className="px-4 py-3 font-semibold">Canal</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginaAtual.map((candidato, index) => {
                  const status = statusCandidato(candidato, {
                    carregando,
                    disparado: Boolean(resultado),
                  });
                  return (
                    <tr
                      key={`${candidato.nome}-${(pagina - 1) * POR_PAGINA + index}`}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6 dark:text-slate-100">
                        {candidato.nome}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{candidato.faltas}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {candidato.numero || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {candidato.canal ? (
                          <span className="inline-flex items-center gap-1">
                            {candidato.canal === 'PESSOAL' ? 'Pessoal' : 'Comercial'}
                            {candidato.usou_fallback ? (
                              <span className="text-xs text-amber-600 dark:text-amber-400">(fallback)</span>
                            ) : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={status} />
                          {!candidato.valido && candidato.motivo_invalido ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {candidato.motivo_invalido}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Página {pagina} de {totalPaginas} · {candidatos.length} registro(s)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resultado ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{resultado.mensagem}</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Arquivo: <strong>{resultado.nome_arquivo}</strong>
            {resultado.status === 'PROCESSANDO' ? (
              <>
                {' '}
                | Status: <strong>em segundo plano</strong> (histórico gravado no banco)
              </>
            ) : (
              <>
                {' '}
                | Mensagens: <strong>{resultado.total_registros_identificados}</strong>
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleEnviar}
          disabled={
            !preview || preview.total_validos === 0 || carregando || carregandoPreview || !whatsappConectado
          }
          className="btn-primary sm:w-auto sm:min-w-[240px]"
        >
          {carregando ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Processando Planilha...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>
                {preview
                  ? `Confirmar e Disparar (${preview.total_validos})`
                  : 'Iniciar Disparos Automáticos'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
