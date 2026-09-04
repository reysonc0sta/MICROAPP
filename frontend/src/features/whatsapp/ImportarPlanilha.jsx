import React, { useState } from 'react';
import { api } from '../../services/api';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function ImportarPlanilha() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArquivo(file);
      setErro('');
      setResultado(null);
    }
  };

  const handleEnviar = async () => {
    if (!arquivo) {
      setErro('Selecione uma planilha .xlsx ou .xls primeiro.');
      return;
    }

    setCarregando(true);
    setErro('');
    setResultado(null);

    const formData = new FormData();
    formData.append('file', arquivo);

    try {
      const response = await api.post('/whatsapp/upload-planilha', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResultado(response.data);
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao enviar a planilha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-6 notranslate">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
        <FileSpreadsheet className="text-green-600" />
        Importar Planilha do Hub Escola
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Suba o arquivo .xlsx ou .xls exportado do sistema para ler os dados e executar o disparo automático.
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">
          {arquivo ? arquivo.name : 'Clique para selecionar ou arraste sua planilha aqui'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Suporta arquivos Excel (.xlsx, .xls)</p>
      </div>

      {erro ? (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      ) : null}

      {resultado ? (
        <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-md text-sm">
          <div className="flex items-center gap-2 font-bold mb-1">
            <CheckCircle size={18} className="text-green-600" />
            <span>{resultado.mensagem}</span>
          </div>
          <p className="text-xs text-green-700">
            Arquivo: <strong>{resultado.nome_arquivo}</strong> | Registros identificados: <strong>{resultado.total_registros_identificados}</strong>
          </p>
        </div>
      ) : null}

      <button
        onClick={handleEnviar}
        disabled={!arquivo || carregando}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2.5 px-4 rounded-md transition-colors"
      >
        {carregando ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Processando Planilha...</span>
          </>
        ) : (
          <span>Iniciar Disparos Automáticos</span>
        )}
      </button>
    </div>
  );
}