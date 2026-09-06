import React from 'react';
import { api } from '../../services/api';
import { AlertTriangle, Send } from 'lucide-react';

export function PainelFaltas({ alunosComFaltas }) {
  const handleDispararLoteFaltas = async () => {
    if (confirm('Deseja iniciar o disparo de mensagens de reposição de faltas para os alunos elegíveis?')) {
      try {
        await api.post('/whatsapp/disparar-reposicoes');
        alert('Automação de faltas iniciada no backend.');
      } catch (error) {
        alert('Erro ao acionar a automação.');
      }
    }
  };

  return (
    <div className="card">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Avisos de Faltas e Reposições</h2>
          <p className="text-sm text-navy-500 dark:text-navy-300">
            Última semana para agendamento de reposição do mês
          </p>
        </div>
        <button
          onClick={handleDispararLoteFaltas}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-900 dark:bg-navy-500 dark:hover:bg-navy-400"
        >
          <Send size={16} />
          Disparar Lembretes de Reposição
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-navy-100 dark:border-navy-700">
        <table className="w-full min-w-[540px] text-left">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50 dark:border-navy-700 dark:bg-navy-800/70">
              <th className="p-3 text-sm font-semibold text-navy-800 dark:text-navy-100">Aluno</th>
              <th className="p-3 text-sm font-semibold text-navy-800 dark:text-navy-100">Turno</th>
              <th className="p-3 text-sm font-semibold text-navy-800 dark:text-navy-100">Faltas</th>
              <th className="p-3 text-sm font-semibold text-navy-800 dark:text-navy-100">Contato Preferencial</th>
            </tr>
          </thead>
          <tbody>
            {alunosComFaltas.map((aluno) => (
              <tr
                key={aluno.id}
                className="border-b border-navy-100 last:border-0 hover:bg-navy-50 dark:border-navy-800 dark:hover:bg-navy-800/40"
              >
                <td className="p-3 font-medium text-navy-900 dark:text-navy-50">{aluno.nome}</td>
                <td className="p-3 text-navy-700 dark:text-navy-200">{aluno.turno}</td>
                <td className="p-3 flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} />
                  {aluno.faltas} falta(s)
                </td>
                <td className="p-3 text-sm text-navy-600 dark:text-navy-300">
                  {aluno.telefone_pessoal || aluno.telefone_comercial || 'Sem número'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
