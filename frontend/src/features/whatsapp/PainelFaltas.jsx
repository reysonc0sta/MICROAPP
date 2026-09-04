// src/features/whatsapp/PainelFaltas.jsx
import React from 'react';
import { api } from '../../services/api';
import { AlertTriangle, Send } from 'lucide-react';

export function PainelFaltas({ alunosComFaltas }) {
  const handleDispararLoteFaltas = async () => {
    if (confirm("Deseja iniciar o disparo de mensagens de reposição de faltas para os alunos elegíveis?")) {
      try {
        await api.post('/whatsapp/disparar-reposicoes');
        alert("Automação de faltas iniciada no backend.");
      } catch (error) {
        alert("Erro ao acionar a automação.");
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Avisos de Faltas e Reposições</h2>
          <p className="text-sm text-gray-500">
            Última semana para agendamento de reposição do mês[cite: 1, 2]
          </p>
        </div>
        <button
          onClick={handleDispararLoteFaltas}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          <Send size={16} />
          Disparar Lembretes de Reposição[cite: 1, 2]
        </button>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-3 text-sm font-semibold">Aluno</th>
            <th className="p-3 text-sm font-semibold">Turno</th>
            <th className="p-3 text-sm font-semibold">Faltas</th>
            <th className="p-3 text-sm font-semibold">Contato Preferencial</th>
          </tr>
        </thead>
        <tbody>
          {alunosComFaltas.map((aluno) => (
            <tr key={aluno.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{aluno.nome}</td>
              <td className="p-3">{aluno.turno}</td>
              <td className="p-3 text-red-600 font-bold flex items-center gap-1">
                <AlertTriangle size={14} />
                {aluno.faltas} falta(s)[cite: 1, 2]
              </td>
              <td className="p-3 text-sm text-gray-600">
                {aluno.telefone_pessoal || aluno.telefone_comercial || 'Sem número'}[cite: 1, 2]
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}