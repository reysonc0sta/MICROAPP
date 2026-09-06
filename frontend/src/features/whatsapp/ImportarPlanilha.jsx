import React, { useState } from 'react';
import { api } from '../../services/api';
import { Upload, FileSpreadsheet, Send, AlertCircle, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function ImportarPlanilha() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [dadosPreview, setDadosPreview] = useState(null);
  const [erro, setErro] = useState('');
  const [processandoEnvio, setProcessandoEnvio] = useState(false);

  // 1. Faz a leitura da planilha e gera o Preview visual
  const handleGerarPreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArquivo(file);
    setCarregando(true);
    setErro('');
    setDadosPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/whatsapp/preview-planilha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDadosPreview(response.data);
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao carregar a pré-visualização.');
    } finally {
      setCarregando(false);
    }
  };

  // 2. Simula/Executa o envio acompanhando linha por linha
  const handleIniciarDisparos = async () => {
    if (!dadosPreview?.registros) return;

    setProcessandoEnvio(true);
    const listaAtualizada = [...dadosPreview.registros];

    for (let i = 0; i < listaAtualizada.length; i++) {
      if (listaAtualizada[i].status === 'SEM_TELEFONE') continue;

      // Atualiza status para PROCESSANDO
      listaAtualizada[i].status = 'PROCESSANDO';
      setDadosPreview({ ...dadosPreview, registros: [...listaAtualizada] });

      // Simulação de tempo de envio (Substituir por chamada real da API)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Atualiza status para SUCESSO
      listaAtualizada[i].status = 'ENVIADO';
      setDadosPreview({ ...dadosPreview, registros: [...listaAtualizada] });
    }

    setProcessandoEnvio(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-5xl mx-auto mt-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
        <FileSpreadsheet className="text-green-600" />
        Importar e Disparar Mensagens (WhatsApp)
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Selecione a planilha para visualizar as mensagens e acompanhar o status do envio de cada aluno em tempo real.
      </p>

      {/* Caixa de Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative mb-6">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleGerarPreview}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-700">
          {arquivo ? arquivo.name : 'Clique para selecionar ou arraste sua planilha Excel (.xlsx, .xls)'}
        </p>
      </div>

      {carregando && (
        <div className="flex items-center justify-center gap-2 text-blue-600 my-4 font-medium">
          <Loader2 className="animate-spin" size={20} />
          Lendo planilha e extraindo contatos...
        </div>
      )}

      {erro && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2 mb-4">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* Tabela de Pré-Visualização e Status */}
      {dadosPreview && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-md border">
            <span className="text-sm font-semibold text-gray-700">
              Registros Encontrados: <strong className="text-blue-600">{dadosPreview.total_identificados}</strong>
            </span>
            <button
              onClick={handleIniciarDisparos}
              disabled={processandoEnvio}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors"
            >
              {processandoEnvio ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Disparando Mensagens...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Confirmar e Iniciar Disparos
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b text-gray-700">
                  <th className="p-3">Aluno</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Turno / Faltas</th>
                  <th className="p-3">Mensagem a Enviar</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {dadosPreview.registros.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium text-gray-900">{item.nome}</td>
                    <td className="p-3 text-gray-600 font-mono">{item.telefone || 'Sem Número'}</td>
                    <td className="p-3">
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-700 mr-1">{item.turno}</span>
                      {item.faltas > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                          {item.faltas} falta(s)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-600 max-w-xs truncate">{item.mensagem}</td>
                    <td className="p-3 text-center">
                      {item.status === 'PENDENTE' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          <Clock size={12} /> Pendente
                        </span>
                      )}
                      {item.status === 'PROCESSANDO' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full animate-pulse">
                          <Loader2 size={12} className="animate-spin" /> Enviando...
                        </span>
                      )}
                      {item.status === 'ENVIADO' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Enviado
                        </span>
                      )}
                      {item.status === 'SEM_TELEFONE' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          <XCircle size={12} /> Sem Número
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}