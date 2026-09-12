import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  gravarStatusWhatsapp,
  lerStatusWhatsapp,
  statusWhatsappConectado,
} from '../features/whatsapp/statusWhatsapp';

export function useWhatsappStatus(usuarioId) {
  const [status, setStatus] = useState('DISCONNECTED');

  const atualizarStatus = useCallback(
    (conectado) => {
      const proximo = conectado ? 'CONNECTED' : 'DISCONNECTED';
      setStatus(proximo);
      if (usuarioId) {
        gravarStatusWhatsapp(usuarioId, proximo);
      }
    },
    [usuarioId]
  );

  useEffect(() => {
    if (!usuarioId) {
      setStatus('DISCONNECTED');
      return undefined;
    }

    setStatus(lerStatusWhatsapp(usuarioId));

    let cancelado = false;

    const consultar = async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        if (!cancelado) {
          atualizarStatus(statusWhatsappConectado(data));
        }
      } catch {
        if (!cancelado) {
          atualizarStatus(false);
        }
      }
    };

    consultar();
    const intervalo = setInterval(consultar, 8000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [usuarioId, atualizarStatus]);

  return {
    status,
    conectado: status === 'CONNECTED',
    atualizarStatus,
  };
}
