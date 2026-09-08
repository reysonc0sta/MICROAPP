import React, { useState, useEffect, useRef } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { QrCode, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

export function ConectarWhatsapp({ onStatusChange }) {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('DISCONNECTED');
  const [erro, setErro] = useState('');
  const [segundosQr, setSegundosQr] = useState(20);
  const conectadoRef = useRef(false);

  const informarStatus = (conectado) => {
    conectadoRef.current = conectado;
    const valor = conectado ? 'CONNECTED' : 'DISCONNECTED';
    setStatus(valor);
    localStorage.setItem('whatsapp_status', valor);
    if (onStatusChange) onStatusChange(valor);
  };

  const aplicarResposta = (data) => {
    const conectado = statusWhatsappConectado(data);
    if (conectado) {
      setQrCode('');
      informarStatus(true);
      return;
    }

    informarStatus(false);
    let base64String = data?.qrcode?.base64 || data?.base64;
    if (base64String) {
      if (!base64String.startsWith('data:image')) {
        base64String = `data:image/png;base64,${base64String}`;
      }
      setQrCode(base64String);
      setSegundosQr(20);
    } else {
      setErro('QR Code ainda não disponível. Clique em Gerar novo QR Code.');
    }
  };

  const checarStatusEObterQR = async (forcar = false) => {
    setLoading(true);
    setErro('');
    try {
      const response = await api.get('/whatsapp/conectar', { params: { forcar } });
      aplicarResposta(response.data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao conectar com a Evolution API.'));
      informarStatus(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checarStatusEObterQR(false);
  }, []);

  useEffect(() => {
    if (status === 'CONNECTED') return undefined;

    const renovarQr = setInterval(() => {
      if (!conectadoRef.current) {
        checarStatusEObterQR(false);
      }
    }, 15000);

    const statusIntervalo = setInterval(async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        if (statusWhatsappConectado(data)) {
          setQrCode('');
          informarStatus(true);
        }
      } catch {
        /* ignora falha pontual de status */
      }
    }, 3000);

    const tick = setInterval(() => {
      setSegundosQr((atual) => (atual > 0 ? atual - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(renovarQr);
      clearInterval(statusIntervalo);
      clearInterval(tick);
    };
  }, [status]);

  return (
    <div className="card mx-auto max-w-md text-center">
      <h2 className="mb-4 flex items-center justify-center gap-2 text-xl font-bold text-navy-900 dark:text-white">
        <QrCode className="text-navy-600 dark:text-navy-300" />
        Conectar WhatsApp
      </h2>

      {status === 'CONNECTED' ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle size={40} className="text-emerald-500" />
          <span>WhatsApp conectado e pronto para disparos.</span>
          <button
            type="button"
            onClick={() => checarStatusEObterQR(false)}
            className="mt-2 text-xs text-emerald-800 underline hover:opacity-80 dark:text-emerald-300"
          >
            Verificar novamente
          </button>
        </div>
      ) : (
        <div>
          {loading ? (
            <p className="mb-4 text-sm text-navy-500 dark:text-navy-300">Preparando um QR Code novo...</p>
          ) : null}

          {erro ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{erro}</span>
            </div>
          ) : null}

          {qrCode && !loading ? (
            <div className="my-4 flex flex-col items-center">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="h-64 w-64 rounded-xl border bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-sm font-medium text-navy-800 dark:text-navy-100">
                Escaneie agora. Este QR expira em {segundosQr}s.
              </p>
              <p className="mt-2 text-xs text-navy-500 dark:text-navy-300">
                WhatsApp {'>'} Configurações {'>'} Aparelhos conectados {'>'} Conectar um aparelho.
                Se aparecer “não foi possível conectar”, espere o QR renovar e tente de novo.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => checarStatusEObterQR(true)}
            disabled={loading}
            className="btn-primary mt-4"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Atualizando...' : 'Gerar novo QR Code'}
          </button>
        </div>
      )}
    </div>
  );
}
