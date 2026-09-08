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
} from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

export function ImportarPlanilha({ whatsappConectado, onIrParaConexao }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [inputKey, setInputKey] = useState(0);

  const limparEstadoArquivo = () => {
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setInputKey((k) => k + 1);
  };

  const carregarPreview = async (file) => {
    setCarregandoPreview(true);
    setErro('');
    setPreview(null);
    setResultado(null);

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

  const handleFileChange = (e) => {
    if (!whatsappConectado) {
      setErro('Conecte o WhatsApp antes de selecionar uma planilha.');
      e.target.value = '';
      return;
    }

    const file = e.target.files[0];
    if (file) {
      setArquivo(file);
      setErro('');
      setResultado(null);
      carregarPreview(file);
    }
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

  return (
    <div className="card mx-auto max-w-3xl notranslate">
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-navy-900 dark:text-white">
        <FileSpreadsheet className="text-navy-600 dark:text-navy-300" />
        Importar Planilha e Disparar
      </h2>
      <p className="mb-6 text-sm text-navy-500 dark:text-navy-300">
        Selecione a planilha para conferir uma prévia de quem vai receber mensagem antes de disparar.
      </p>

      {!whatsappConectado ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <WifiOff size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>WhatsApp desconectado.</strong> Conecte o aparelho pelo QR Code para liberar o envio da planilha.{' '}
            {onIrParaConexao ? (
              <button
                type="button"
                onClick={onIrParaConexao}
                className="font-semibold underline"
              >
                Ir para Conectar WhatsApp
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          whatsappConectado
            ? 'cursor-pointer border-navy-200 bg-navy-50 hover:bg-navy-100/70 dark:border-navy-600 dark:bg-navy-800/50'
            : 'cursor-not-allowed border-navy-200 bg-navy-50/60 opacity-60 dark:border-navy-700 dark:bg-navy-950/40'
        }`}
      >
        <input
          key={inputKey}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={!whatsappConectado || carregandoPreview || carregando}
          className="absolute inset-0 h-full w-full opacity-0 disabled:cursor-not-allowed"
        />
        <Upload className="mx-auto mb-3 h-12 w-12 text-navy-400" />
        <p className="text-sm font-medium text-navy-800 dark:text-navy-100">
          {arquivo ? arquivo.name : 'Clique para selecionar ou arraste sua planilha aqui'}
        </p>
        <p className="mt-1 text-xs text-navy-400">Suporta arquivos Excel (.xlsx, .xls)</p>
      </div>

      {erro ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      ) : null}

      {carregandoPreview ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-navy-500 dark:text-navy-300">
          <Loader2 className="animate-spin" size={16} />
          <span>Lendo a planilha para pré-visualização...</span>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy-100 px-2.5 py-1 font-medium text-navy-700 dark:bg-navy-800 dark:text-navy-200">
              <Users size={14} />
              {preview.total_linhas} aluno(s) com falta
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle size={14} />
              {preview.total_validos} receberão mensagem
            </span>
            {preview.total_invalidos > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <PhoneOff size={14} />
                {preview.total_invalidos} sem telefone válido
              </span>
            ) : null}
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-navy-200 dark:border-navy-700">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                <tr>
                  <th className="px-3 py-2 font-semibold">Aluno</th>
                  <th className="px-3 py-2 font-semibold">Faltas</th>
                  <th className="px-3 py-2 font-semibold">Telefone que será usado</th>
                  <th className="px-3 py-2 font-semibold">Canal</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                {preview.candidatos.map((candidato, index) => (
                  <tr key={`${candidato.nome}-${index}`} className={candidato.valido ? '' : 'opacity-60'}>
                    <td className="px-3 py-2 text-navy-900 dark:text-navy-100">{candidato.nome}</td>
                    <td className="px-3 py-2 text-navy-700 dark:text-navy-300">{candidato.faltas}</td>
                    <td className="px-3 py-2 text-navy-700 dark:text-navy-300">
                      {candidato.numero || '—'}
                    </td>
                    <td className="px-3 py-2 text-navy-700 dark:text-navy-300">
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
                    <td className="px-3 py-2">
                      {candidato.valido ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={14} /> Pronto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <PhoneOff size={14} /> {candidato.motivo_invalido}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {resultado ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{resultado.mensagem}</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Arquivo: <strong>{resultado.nome_arquivo}</strong>
            {resultado.status === 'PROCESSANDO' ? (
              <> | Status: <strong>em segundo plano</strong> (histórico gravado no banco)</>
            ) : (
              <>
                {' '}
                | Mensagens: <strong>{resultado.total_registros_identificados}</strong>
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleEnviar}
          disabled={!preview || preview.total_validos === 0 || carregando || carregandoPreview || !whatsappConectado}
          className="btn-primary"
        >
          {carregando ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Processando Planilha...</span>
            </>
          ) : (
            <span>
              {preview ? `Confirmar e Disparar (${preview.total_validos})` : 'Iniciar Disparos Automáticos'}
            </span>
          )}
        </button>

        {arquivo && !carregando ? (
          <button type="button" onClick={limparEstadoArquivo} className="text-sm text-navy-500 underline dark:text-navy-300">
            Escolher outra planilha
          </button>
        ) : null}
      </div>
    </div>
  );
}