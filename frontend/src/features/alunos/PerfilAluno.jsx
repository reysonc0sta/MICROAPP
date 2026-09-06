import React, { useState } from 'react';
import { api } from '../../services/api';
import { MessageSquare, CheckCircle, Clock } from 'lucide-react';

export function PerfilAluno({ aluno, materiasGrade, resultadosProvas }) {
  const [enviando, setEnviando] = useState({});

  const handleNotificarNota = async (materiaId) => {
    setEnviando((prev) => ({ ...prev, [materiaId]: true }));
    try {
      await api.post(`/whatsapp/notificar-nota`, null, {
        params: { aluno_id: aluno.id, materia_id: materiaId }
      });
      alert('Disparo de nota adicionado à fila do WhatsApp!');
    } catch (error) {
      alert('Erro ao solicitar envio no WhatsApp.');
    } finally {
      setEnviando((prev) => ({ ...prev, [materiaId]: false }));
    }
  };

  return (
    <div className="card">
      <h2 className="mb-2 text-xl font-bold text-navy-900 dark:text-white">{aluno.nome}</h2>
      <p className="mb-4 text-sm text-navy-500 dark:text-navy-300">
        Turno: <strong className="text-navy-800 dark:text-navy-100">{aluno.turno}</strong> | Tel. Pessoal:{' '}
        {aluno.telefone_pessoal || 'Pendente'} | Tel. Comercial: {aluno.telefone_comercial || 'Pendente'}
      </p>

      <h3 className="mb-3 text-lg font-semibold text-navy-800 dark:text-navy-100">Grade de Matérias e Avaliações</h3>

      <div className="space-y-3">
        {materiasGrade.map((materia) => {
          const provaRealizada = resultadosProvas.find((p) => p.materia_id === materia.id);

          return (
            <div
              key={materia.id}
              className="flex flex-col gap-3 rounded-xl border border-navy-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-navy-700"
            >
              <div>
                <span className="font-medium text-navy-800 dark:text-navy-50">{materia.nome}</span>
                {provaRealizada ? (
                  <div className="mt-1 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={16} />
                    <span>
                      Realizada (Nota: <strong>{provaRealizada.nota}</strong> - {provaRealizada.tentativa}ª tentativa)
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-300">
                    <Clock size={16} />
                    <span>Matéria Pendente</span>
                  </div>
                )}
              </div>

              {provaRealizada ? (
                <button
                  onClick={() => handleNotificarNota(materia.id)}
                  disabled={enviando[materia.id]}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-900 disabled:opacity-50 dark:bg-navy-500 dark:hover:bg-navy-400"
                >
                  <MessageSquare size={16} />
                  {enviando[materia.id] ? 'Enviando...' : 'Enviar Nota via WhatsApp'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
