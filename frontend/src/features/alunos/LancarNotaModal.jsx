import React, { useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { AlertCircle, Loader2, X, Save } from 'lucide-react';

export function LancarNotaModal({ aluno, materia, onClose, onSaved }) {
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valor = Number(nota);
    if (Number.isNaN(valor) || valor < 0 || valor > 10) {
      setErro('Informe uma nota entre 0 e 10.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await api.post('/provas/lancar', {
        aluno_id: aluno.id,
        materia_id: materia.id,
        nota: valor,
      });
      onSaved();
    } catch (err) {
      setErro(apiErrorMessage(err, 'Não foi possível lançar a nota.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-label="Fechar" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Lançar nota</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {aluno.nome} · {materia.nome}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        {erro ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {erro}
          </div>
        ) : null}

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nota (0 a 10)</label>
        <input
          type="number"
          min={0}
          max={10}
          step="0.01"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          required
          className="field"
          autoFocus
        />

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-primary sm:w-auto">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar nota
          </button>
        </div>
      </form>
    </div>
  );
}
