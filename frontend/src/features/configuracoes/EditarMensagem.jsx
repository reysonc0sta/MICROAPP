import React, { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { MessageSquareText, CheckCircle, AlertCircle, Loader2, Save, Eye } from 'lucide-react';

export function EditarMensagem() {
  const [template, setTemplate] = useState('');
  const [exemplo, setExemplo] = useState('');
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const { data } = await api.get('/configuracoes/mensagem');
        setTemplate(data.template);
        setExemplo(data.exemplo_renderizado);
      } catch (err) {
        setErro(apiErrorMessage(err, 'Erro ao carregar a mensagem atual.'));
      } finally {
        setCarregandoInicial(false);
      }
    };
    carregar();
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    setErro('');
    setSucesso(false);

    try {
      const { data } = await api.put('/configuracoes/mensagem', { template });
      setExemplo(data.exemplo_renderizado);
      setSucesso(true);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao salvar a mensagem.'));
    } finally {
      setSalvando(false);
    }
  };

  // Recalcula o exemplo localmente enquanto o usuário digita, sem precisar salvar antes.
  useEffect(() => {
    if (!template) {
      setExemplo('');
      return;
    }
    try {
      setExemplo(template.replaceAll('{nome}', 'João').replaceAll('{faltas}', '3'));
    } catch {
      setExemplo('');
    }
  }, [template]);

  if (carregandoInicial) {
    return (
      <div className="card mx-auto flex max-w-2xl items-center gap-2 text-sm text-navy-500 dark:text-navy-300">
        <Loader2 className="animate-spin" size={16} />
        <span>Carregando mensagem atual...</span>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-2xl notranslate">
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-navy-900 dark:text-white">
        <MessageSquareText className="text-navy-600 dark:text-navy-300" />
        Editar Mensagem de Reposição
      </h2>
      <p className="mb-6 text-sm text-navy-500 dark:text-navy-300">
        Essa é a mensagem enviada automaticamente para o aluno quando ele possui faltas registradas.
      </p>

      <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
        Texto da mensagem
      </label>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={6}
        className="field resize-none font-mono text-sm"
        placeholder="Olá, {nome}! Você possui {faltas} falta(s)..."
      />

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-navy-500 dark:text-navy-400">
        <span>Placeholders disponíveis:</span>
        <code className="rounded bg-navy-100 px-1.5 py-0.5 dark:bg-navy-800">{'{nome}'}</code>
        <code className="rounded bg-navy-100 px-1.5 py-0.5 dark:bg-navy-800">{'{faltas}'}</code>
      </div>

      {exemplo ? (
        <div className="mt-4 rounded-xl border border-navy-200 bg-navy-50 p-4 dark:border-navy-700 dark:bg-navy-900/40">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-navy-500 dark:text-navy-400">
            <Eye size={14} />
            Prévia (com dados de exemplo)
          </div>
          <p className="text-sm text-navy-800 dark:text-navy-100">{exemplo}</p>
        </div>
      ) : null}

      {erro ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      ) : null}

      {sucesso ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle size={16} />
          <span>Mensagem atualizada com sucesso!</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando || !template.includes('{nome}')}
        className="btn-primary mt-6"
      >
        {salvando ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <Save size={18} />
            <span>Salvar Mensagem</span>
          </>
        )}
      </button>
    </div>
  );
}