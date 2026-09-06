import React, { useState } from 'react';
import { api } from '../../services/api';
import { Upload, Clock, WifiOff, AlertCircle } from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

export function PainelFaltas({ whatsappConectado, onIrParaConexao }) {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!whatsappConectado) {
      setErro('Conecte o WhatsApp antes de enviar a planilha de faltas.');
      e.target.value = '';
      return;
    }

    setArquivo(file);
    setErro('');
    setCarregando(true);

    try {
      const status = await api.get('/whatsapp/status');
      if (!statusWhatsappConectado(status.data)) {
        setErro('WhatsApp desconectado. Conecte o aparelho pelo QR Code antes de disparar mensagens.');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/whatsapp/disparar-reposicoes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRelatorio(response.data.dados);
    } catch (error) {
      setErro(error.response?.data?.detail || 'Erro ao processar disparos de reposição.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="card mx-auto mt-6 max-w-4xl">
      <h2 className="mb-2 text-xl font-bold text-navy-900 dark:text-white">Automação de Reposição de Faltas</h2>
      <p className="mb-6 text-sm text-navy-500 dark:text-navy-300">
        Envie a planilha de controle para notificar alunos com faltas sobre a última semana de reposição.
      </p>

      {!whatsappConectado ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <WifiOff size={20} className="mt-0.5 shrink-0" />
          <span>
            WhatsApp desconectado. Conecte o aparelho para liberar o envio.{' '}
            {onIrParaConexao ? (
              <button type="button" onClick={onIrParaConexao} className="font-semibold underline">
                Ir para Conectar WhatsApp
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div
        className={`mb-6 rounded-xl border-2 border-dashed p-6 text-center ${
          whatsappConectado
            ? 'border-navy-200 bg-navy-50 dark:border-navy-600 dark:bg-navy-800/50'
            : 'border-navy-200 bg-navy-50/60 opacity-60 dark:border-navy-700'
        }`}
      >
        <input
          type="file"
          accept=".xls, .xlsx"
          onChange={handleUpload}
          className="hidden"
          id="excel-upload"
          disabled={!whatsappConectado}
        />
        <label
          htmlFor="excel-upload"
          className={`flex flex-col items-center ${whatsappConectado ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <Upload className="mb-2 h-10 w-10 text-navy-400" />
          <span className="text-sm font-medium text-navy-800 dark:text-navy-100">
            {arquivo ? arquivo.name : 'Clique para carregar a planilha de faltas (.xls/.xlsx)'}
          </span>
        </label>
      </div>

      {erro ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      ) : null}

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-8 font-medium text-navy-700 dark:text-navy-200">
          <Clock className="animate-spin" /> Processando envios...
        </div>
      ) : null}

      {relatorio ? (
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-3 text-lg font-semibold">Relatório de Disparos Realizados</h3>
          <p className="mb-4 text-sm text-navy-600 dark:text-navy-300">
            Total de mensagens enviadas: <strong>{relatorio.total_disparados}</strong>
          </p>

          <table className="w-full min-w-[540px] text-left">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 dark:border-navy-700 dark:bg-navy-800/70">
                <th className="p-3 text-sm">Aluno</th>
                <th className="p-3 text-sm">Número Destino</th>
                <th className="p-3 text-sm">Canal</th>
                <th className="p-3 text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.detalhes.map((item, idx) => (
                <tr key={idx} className="border-b border-navy-100 dark:border-navy-800">
                  <td className="p-3 font-medium">{item.nome}</td>
                  <td className="p-3">{item.numero}</td>
                  <td className="p-3 text-sm text-navy-500">{item.canal}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <Clock size={12} /> {item.status || 'Aguardando resposta'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
