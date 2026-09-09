import React, { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  Upload,
  Bell,
  CheckCircle,
  AlertCircle,
  Loader2,
  WifiOff,
  Users,
  PhoneOff,
  Sun,
  Sunset,
  Moon,
  Layers,
  Send,
  X,
  MessageSquareText,
} from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

const TURNOS = [
  { valor: 'MANHA', label: 'Manhã', Icon: Sun },
  { valor: 'TARDE', label: 'Tarde', Icon: Sunset },
  { valor: 'NOITE', label: 'Noite', Icon: Moon },
  { valor: 'TODOS', label: 'Todos', Icon: Layers },
];

function StatusBadge({ valido, motivo }) {
  if (valido) {
    return (
      <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle size={11} />
        Pronto
      </span>
    );
  }

  return (
    <span className="badge border-red-200 bg-red-50 text-red-700 shadow-sm dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
      <PhoneOff size={11} />
      {motivo || 'Inválido'}
    </span>
  );
}

export function DispararLembretes({ whatsappConectado, onIrParaConexao }) {
  const [turno, setTurno] = useState('MANHA');
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [template, setTemplate] = useState('');
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [salvandoMsg, setSalvandoMsg] = useState(false);
  const [msgSalva, setMsgSalva] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const { data } = await api.get('/configuracoes/mensagem-lembrete');
        setTemplate(data.template);
      } catch {
        setTemplate(
          'Olá, {nome}! Informamos que não haverá aula no turno da {turno} nesta data. Qualquer dúvida, responda esta mensagem.'
        );
      }
    };
    carregar();
  }, []);

  const limparEstadoArquivo = () => {
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setInputKey((k) => k + 1);
  };

  const carregarPreview = async (file, turnoSelecionado = turno) => {
    setCarregandoPreview(true);
    setErro('');
    setPreview(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('turno', turnoSelecionado);

      const response = await api.post('/whatsapp/preview-lembretes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(response.data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao ler a planilha para pré-visualização.'));
      setArquivo(null);
    } finally {
      setCarregandoPreview(false);
    }
  };

  const aceitarArquivo = (file) => {
    if (!whatsappConectado) {
      setErro('Conecte o WhatsApp antes de selecionar uma planilha.');
      return;
    }
    if (!file) return;

    const nome = file.name.toLowerCase();
    if (!nome.endsWith('.xlsx') && !nome.endsWith('.xls')) {
      setErro('Envie apenas arquivos Excel (.xlsx ou .xls).');
      return;
    }

    setArquivo(file);
    setErro('');
    setResultado(null);
    carregarPreview(file, turno);
  };

  const handleFileChange = (e) => {
    aceitarArquivo(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (!whatsappConectado || carregandoPreview || carregando) return;
    aceitarArquivo(e.dataTransfer.files?.[0]);
  };

  const handleTrocarTurno = (novoTurno) => {
    setTurno(novoTurno);
    setResultado(null);
    if (arquivo) {
      carregarPreview(arquivo, novoTurno);
    }
  };

  const handleSalvarMensagem = async () => {
    setSalvandoMsg(true);
    setErro('');
    setMsgSalva('');
    try {
      const { data } = await api.put('/configuracoes/mensagem-lembrete', { template });
      setTemplate(data.template);
      setMsgSalva('Mensagem salva com sucesso.');
      if (arquivo) {
        await carregarPreview(arquivo, turno);
      }
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao salvar a mensagem do lembrete.'));
    } finally {
      setSalvandoMsg(false);
    }
  };

  const handleEnviar = async () => {
    if (!whatsappConectado) {
      setErro('Você precisa conectar o WhatsApp antes de iniciar os disparos.');
      return;
    }

    if (!arquivo) {
      setErro('Selecione uma planilha .xlsx ou .xls primeiro.');
      return;
    }

    setCarregando(true);
    setErro('');
    setResultado(null);

    try {
      await api.put('/configuracoes/mensagem-lembrete', { template });

      const status = await api.get('/whatsapp/status');
      if (!statusWhatsappConectado(status.data)) {
        setErro('WhatsApp desconectado. Conecte o aparelho pelo QR Code antes de disparar mensagens.');
        return;
      }

      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('turno', turno);

      const response = await api.post('/whatsapp/disparar-lembretes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(response.data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao processar o disparo de lembretes.'));
    } finally {
      setCarregando(false);
    }
  };

  const dropzoneAtiva = whatsappConectado && !carregandoPreview && !carregando;

  return (
    <div className="notranslate w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Bell size={22} className="text-navy-600 dark:text-navy-300" />
            Disparar Lembretes
          </h2>
          <p className="page-subtitle mt-1">
            Use a mesma planilha do Hub Escola. Escolha o turno e envie avisos (ex.: não haverá aula)
            só para esse grupo.
          </p>
        </div>
        {arquivo && !carregando ? (
          <button type="button" onClick={limparEstadoArquivo} className="btn-secondary sm:w-auto">
            <X size={16} />
            Escolher outra planilha
          </button>
        ) : null}
      </div>

      {!whatsappConectado ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <WifiOff size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>WhatsApp desconectado.</strong> Conecte o aparelho pelo QR Code para liberar o envio.{' '}
            {onIrParaConexao ? (
              <button type="button" onClick={onIrParaConexao} className="font-semibold underline">
                Ir para Conectar WhatsApp
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="card">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Turno do disparo</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TURNOS.map(({ valor, label, Icon }) => (
            <button
              key={valor}
              type="button"
              onClick={() => handleTrocarTurno(valor)}
              disabled={carregandoPreview || carregando}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                turno === valor
                  ? 'border-navy-700 bg-navy-800 text-white shadow-sm dark:border-navy-400 dark:bg-navy-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareText size={18} className="text-navy-600 dark:text-navy-300" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Mensagem do lembrete</h3>
        </div>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className="field resize-y font-mono text-sm"
          placeholder="Olá, {nome}! Não haverá aula no turno da {turno}..."
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Placeholders:</span>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">{'{nome}'}</code>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">{'{turno}'}</code>
          <button
            type="button"
            onClick={handleSalvarMensagem}
            disabled={salvandoMsg || !template.includes('{nome}')}
            className="ml-auto text-navy-700 underline disabled:opacity-40 dark:text-navy-200"
          >
            {salvandoMsg ? 'Salvando...' : 'Salvar mensagem'}
          </button>
          {msgSalva ? <span className="text-emerald-600 dark:text-emerald-400">{msgSalva}</span> : null}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (dropzoneAtiva) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        className={`dropzone ${
          arrastando
            ? 'border-navy-500 bg-navy-50/80 shadow-md dark:border-navy-400 dark:bg-navy-950/40'
            : dropzoneAtiva
              ? 'cursor-pointer border-slate-300 bg-white/70 shadow-sm hover:border-navy-400 hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-navy-500'
              : 'cursor-not-allowed border-slate-200 bg-slate-50/60 opacity-60 dark:border-slate-800 dark:bg-slate-950/40'
        }`}
      >
        <input
          key={inputKey}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={!dropzoneAtiva}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-800 text-white shadow-md dark:bg-navy-600">
          <Upload size={28} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {arquivo ? arquivo.name : 'Arraste a planilha aqui ou clique para selecionar'}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Mesma planilha do Hub Escola (.xlsx, .xls)
        </p>
      </div>

      {erro ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{erro}</span>
        </div>
      ) : null}

      {carregandoPreview ? (
        <div className="card flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
          <Loader2 className="animate-spin" size={16} />
          <span>Filtrando alunos do turno selecionado...</span>
        </div>
      ) : null}

      {preview ? (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-md">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
            <span className="badge border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <Users size={12} />
              {preview.total_linhas} aluno(s) no filtro
            </span>
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle size={12} />
              {preview.total_validos} receberão mensagem
            </span>
            {preview.total_invalidos > 0 ? (
              <span className="badge border-red-200 bg-red-50 text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <PhoneOff size={12} />
                {preview.total_invalidos} sem telefone válido
              </span>
            ) : null}
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 font-semibold sm:px-6">Aluno</th>
                  <th className="px-4 py-3.5 font-semibold">Turno</th>
                  <th className="px-4 py-3.5 font-semibold">Telefone</th>
                  <th className="px-4 py-3.5 font-semibold sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {preview.candidatos.map((candidato, index) => (
                  <tr
                    key={`${candidato.nome}-${index}`}
                    className={`transition duration-150 ${candidato.valido ? '' : 'opacity-70'}`}
                  >
                    <td className="px-4 py-3.5 font-medium text-slate-900 sm:px-6 dark:text-slate-100">
                      {candidato.nome}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{candidato.turno_label}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {candidato.numero || '—'}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <StatusBadge valido={candidato.valido} motivo={candidato.motivo_invalido} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {resultado ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{resultado.mensagem}</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Arquivo: <strong>{resultado.nome_arquivo}</strong>
            {resultado.status === 'PROCESSANDO' ? (
              <> | Status: <strong>em segundo plano</strong></>
            ) : (
              <>
                {' '}
                | Mensagens: <strong>{resultado.total_registros_identificados}</strong>
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleEnviar}
          disabled={!preview || preview.total_validos === 0 || carregando || carregandoPreview || !whatsappConectado}
          className="btn-primary sm:w-auto sm:min-w-[240px]"
        >
          {carregando ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Disparando lembretes...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>
                {preview
                  ? `Confirmar e Disparar (${preview.total_validos})`
                  : 'Disparar Lembretes'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
