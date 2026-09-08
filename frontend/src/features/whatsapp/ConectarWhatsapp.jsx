import React, { useState, useEffect, useRef } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  QrCode,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Smartphone,
  Link2,
  ListOrdered,
} from 'lucide-react';
import { statusWhatsappConectado, gravarStatusWhatsapp } from './statusWhatsapp';

const PASSOS = [
  'Abra o WhatsApp no celular.',
  'Toque em Configurações → Aparelhos conectados.',
  'Escolha Conectar um aparelho e escaneie o QR Code.',
  'Aguarde a confirmação “Conectado” nesta tela.',
];

function lerUsuarioId() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null')?.id;
  } catch {
    return null;
  }
}

export function ConectarWhatsapp({ onStatusChange }) {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('DISCONNECTED');
  const [erro, setErro] = useState('');
  const [segundosQr, setSegundosQr] = useState(20);
  const [pairingCode, setPairingCode] = useState('');
  const [estadoInstancia, setEstadoInstancia] = useState('close');
  const [instanceName, setInstanceName] = useState('');
  const conectadoRef = useRef(false);
  const emVooRef = useRef(false);
  const usuarioId = lerUsuarioId();

  const informarStatus = (conectado) => {
    conectadoRef.current = conectado;
    const valor = conectado ? 'CONNECTED' : 'DISCONNECTED';
    setStatus(valor);
    if (usuarioId) {
      gravarStatusWhatsapp(usuarioId, valor);
    }
    if (onStatusChange) onStatusChange(valor);
  };

  const aplicarResposta = (data, silencioso = false) => {
    const conectado = statusWhatsappConectado(data);
    const estado = String(data?.instance?.state || data?.state || (conectado ? 'open' : 'close'));
    setEstadoInstancia(estado);
    setPairingCode(data?.pairingCode || '');
    if (data?.instanceName || data?.instance?.instanceName) {
      setInstanceName(data.instanceName || data.instance.instanceName);
    }

    if (conectado) {
      setQrCode('');
      setErro('');
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
      setSegundosQr(40);
      setErro('');
    } else if (!silencioso) {
      setErro('QR Code ainda não disponível. Clique em Sincronizar para gerar um novo.');
    }
  };

  const checarStatusEObterQR = async (forcar = false, silencioso = false) => {
    if (emVooRef.current) return;
    emVooRef.current = true;
    if (!silencioso) {
      setLoading(true);
      setErro('');
    }
    try {
      const response = await api.get('/whatsapp/conectar', { params: { forcar } });
      aplicarResposta(response.data, silencioso);
    } catch (err) {
      if (!silencioso) {
        setErro(apiErrorMessage(err, 'Erro ao conectar com a Evolution API.'));
      }
      informarStatus(false);
    } finally {
      emVooRef.current = false;
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    checarStatusEObterQR(false);
  }, []);

  useEffect(() => {
    if (status === 'CONNECTED') return undefined;

    const renovarQr = setInterval(() => {
      if (!conectadoRef.current) {
        checarStatusEObterQR(false, true);
      }
    }, 20000);

    const statusIntervalo = setInterval(async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        if (statusWhatsappConectado(data)) {
          setQrCode('');
          setEstadoInstancia('open');
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

  const conectado = status === 'CONNECTED';

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <QrCode size={22} className="text-navy-600 dark:text-navy-300" />
          Conectar WhatsApp
        </h2>
        <p className="page-subtitle mt-1">
          Cada login conecta o próprio número de WhatsApp. Escaneie o QR Code com o celular desta conta
          para liberar os disparos
          {instanceName ? (
            <>
              {' '}
              (<span className="font-medium text-slate-600 dark:text-slate-300">{instanceName}</span>).
            </>
          ) : (
            '.'
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna status / instruções */}
        <section className="flex flex-col gap-5 lg:col-span-5">
          <div className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                Status da instância
              </h3>
              <span
                className={`badge ${
                  conectado
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {conectado ? <Wifi size={12} /> : <WifiOff size={12} />}
                {conectado ? 'CONECTADO' : 'DESCONECTADO'}
              </span>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Link2 size={14} />
                  Estado
                </dt>
                <dd className="font-mono text-xs font-semibold uppercase text-slate-800 dark:text-slate-100">
                  {estadoInstancia}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Smartphone size={14} />
                  Endereço / pairing
                </dt>
                <dd className="max-w-[55%] truncate text-right font-mono text-xs text-slate-800 dark:text-slate-100">
                  {pairingCode || 'Evolution API · WhatsApp Web'}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => checarStatusEObterQR(true)}
              disabled={loading}
              className="btn-primary mt-5"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Sincronizando...' : 'Sincronizar / Gerar QR'}
            </button>
          </div>

          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              <ListOrdered size={16} className="text-slate-500" />
              Passo a passo
            </h3>
            <ol className="space-y-3">
              {PASSOS.map((passo, index) => (
                <li key={passo} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[11px] font-bold text-white dark:bg-navy-600">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{passo}</span>
                </li>
              ))}
            </ol>
          </div>

          {erro ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          ) : null}
        </section>

        {/* Coluna QR */}
        <section className="lg:col-span-7">
          <div className="card flex h-full min-h-[420px] flex-col items-center justify-center text-center">
            {conectado ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                    WhatsApp conectado
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Instância pronta para disparos de mensagens.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => checarStatusEObterQR(false)}
                  className="btn-secondary sm:w-auto"
                >
                  <RefreshCw size={16} />
                  Verificar novamente
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  QR Code da sessão
                </p>

                <div className="relative flex h-72 w-72 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950">
                  {loading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-48 w-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                      <span className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 size={16} className="animate-spin" />
                        Preparando QR Code...
                      </span>
                    </div>
                  ) : qrCode ? (
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="h-64 w-64 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-6 text-slate-400 dark:text-slate-500">
                      <QrCode size={48} />
                      <p className="text-sm">Aguardando geração do QR Code</p>
                    </div>
                  )}
                </div>

                {qrCode && !loading ? (
                  <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Escaneie agora. Este QR expira em{' '}
                    <span className="tabular-nums text-navy-700 dark:text-navy-300">{segundosQr}s</span>.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
