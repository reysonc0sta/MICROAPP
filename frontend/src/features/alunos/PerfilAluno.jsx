import React, { useState } from 'react';
import { api } from '../../services/api';
import { MessageSquare, CheckCircle, Clock } from 'lucide-react';

export function PerfilAluno({ aluno, materiasGrade, resultadosProvas }) {
  const [enviando, setEnviando] = useState({});

  // Função para acionar a notificação no WhatsApp (FastAPI)
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
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">{aluno.nome}</h2>
      <p className="text-gray-600 mb-4">
        Turno: <strong>{aluno.turno}</strong> | 
        Tel. Pessoal: {aluno.telefone_pessoal || 'Pendente'} | 
        Tel. Comercial: {aluno.telefone_comercial || 'Pendente'}
      </p>

      <h3 className="text-lg font-semibold mb-3">Grade de Matérias e Avaliações</h3>

      <div className="space-y-3">
        {materiasGrade.map((materia) => {
          // Busca a prova mais recente para a matéria (última tentativa)
          const provaRealizada = resultadosProvas.find(p => p.materia_id === materia.id);

          return (
            <div key={materia.id} className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <span className="font-medium text-gray-800">{materia.nome}</span>
                {provaRealizada ? (
                  <div className="flex items-center gap-2 mt-1 text-sm text-green-700">
                    <CheckCircle size={16} />
                    <span>Realizada (Nota: <strong>{provaRealizada.nota}</strong> - {provaRealizada.tentativa}ª tentativa)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 text-sm text-amber-600">
                    <Clock size={16} />
                    <span>Matéria Pendente</span>
                  </div>
                )}
              </div>

              {/* Botão de Disparo do WhatsApp disponível apenas para matérias realizadas */}
              {provaRealizada && (
                <button
                  onClick={() => handleNotificarNota(materia.id)}
                  disabled={enviando[materia.id]}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  <MessageSquare size={16} />
                  {enviando[materia.id] ? 'Enviando...' : 'Enviar Nota via WhatsApp'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}