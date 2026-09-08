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
} from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

const TURNOS = [
  { valor: 'MANHA', label: 'Manhã', Icon: Sun },
  { valor: 'TARDE', label: 'Tarde', Icon: Sunset },
  { valor: 'NOITE', label: 'Noite', Icon: Moon },
  { valor: 'TODOS', label: 'Todos', Icon: Layers },
];

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

  const handleFileChange = (e) => {
    if (!whatsappConectado) {
      setErro('Conecte o WhatsApp antes de selecionar uma planilha.');
      e.target.value = '';
      return;
    }

    const file = e.target.files[0];
    if (file) {
      setArquivo(file);
      setErro('');
      setResultado(null);
      carregarPreview(file, turno);
    }
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

  return (
    <div className="card mx-auto max-w-3xl notranslate">
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-navy-900 dark:text-white">
        <Bell className="text-navy-600 dark:text-navy-300" />
        Disparar Lembretes
      </h2>
      <p className="mb-6 text-sm text-navy-500 dark:text-navy-300">
        Use a mesma planilha do Hub Escola. Escolha o turno e envie avisos (ex.: não haverá aula) só para esse grupo.
      </p>

      {!whatsappConectado ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
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

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-navy-800 dark:text-navy-100">Turno do disparo</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TURNOS.map(({ valor, label, Icon }) => (
            <button
              key={valor}
              type="button"
              onClick={() => handleTrocarTurno(valor)}
              disabled={carregandoPreview || carregando}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                turno === valor
                  ? 'border-navy-700 bg-navy-800 text-white dark:border-navy-400 dark:bg-navy-500'
                  : 'border-navy-200 bg-white text-navy-800 hover:bg-navy-50 dark:border-navy-600 dark:bg-navy-900 dark:text-navy-100 dark:hover:bg-navy-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-100">
          Mensagem do lembrete
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className="field resize-none font-mono text-sm"
          placeholder="Olá, {nome}! Não haverá aula no turno da {turno}..."
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-navy-500 dark:text-navy-400">
          <span>Placeholders:</span>
          <code className="rounded bg-navy-100 px-1.5 py-0.5 dark:bg-navy-800">{'{nome}'}</code>
          <code className="rounded bg-navy-100 px-1.5 py-0.5 dark:bg-navy-800">{'{turno}'}</code>
          <button
            type="button"
            onClick={handleSalvarMensagem}
            disabled={salvandoMsg || !template.includes('{nome}')}
            className="ml-auto text-navy-700 underline dark:text-navy-200"
          >
            {salvandoMsg ? 'Salvando...' : 'Salvar mensagem'}
          </button>
          {msgSalva ? <span className="text-emerald-600 dark:text-emerald-400">{msgSalva}</span> : null}
        </div>
      </div>

      <div
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          whatsappConectado
            ? 'cursor-pointer border-navy-200 bg-navy-50 hover:bg-navy-100/70 dark:border-navy-600 dark:bg-navy-800/50'
            : 'cursor-not-allowed border-navy-200 bg-navy-50/60 opacity-60 dark:border-navy-700 dark:bg-navy-950/40'
        }`}
      >
        <input
          key={inputKey}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={!whatsappConectado || carregandoPreview || carregando}
          className="absolute inset-0 h-full w-full opacity-0 disabled:cursor-not-allowed"
        />
        <Upload className="mx-auto mb-3 h-12 w-12 text-navy-400" />
        <p className="text-sm font-medium text-navy-800 dark:text-navy-100">
          {arquivo ? arquivo.name : 'Clique para selecionar ou arraste a planilha aqui'}
        </p>
        <p className="mt-1 text-xs text-navy-400">Mesma planilha do Hub Escola (.xlsx, .xls)</p>
      </div>

      {erro ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      ) : null}

      {carregandoPreview ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-navy-500 dark:text-navy-300">
          <Loader2 className="animate-spin" size={16} />
          <span>Filtrando alunos do turno selecionado...</span>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy-100 px-2.5 py-1 font-medium text-navy-700 dark:bg-navy-800 dark:text-navy-200">
              <Users size={14} />
              {preview.total_linhas} aluno(s) no filtro
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle size={14} />
              {preview.total_validos} receberão mensagem
            </span>
            {preview.total_invalidos > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <PhoneOff size={14} />
                {preview.total_invalidos} sem telefone válido
              </span>
            ) : null}
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-navy-200 dark:border-navy-700">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                <tr>
                  <th className="px-3 py-2 font-semibold">Aluno</th>
                  <th className="px-3 py-2 font-semibold">Turno</th>
                  <th className="px-3 py-2 font-semibold">Telefone</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                {preview.candidatos.map((candidato, index) => (
                  <tr key={`${candidato.nome}-${index}`} className={candidato.valido ? '' : 'opacity-60'}>
                    <td className="px-3 py-2 text-navy-900 dark:text-navy-100">{candidato.nome}</td>
                    <td className="px-3 py-2 text-navy-700 dark:text-navy-300">{candidato.turno_label}</td>
                    <td className="px-3 py-2 text-navy-700 dark:text-navy-300">
                      {candidato.numero || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {candidato.valido ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={14} /> Pronto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <PhoneOff size={14} /> {candidato.motivo_invalido}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {resultado ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleEnviar}
          disabled={!preview || preview.total_validos === 0 || carregando || carregandoPreview || !whatsappConectado}
          className="btn-primary"
        >
          {carregando ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Disparando lembretes...</span>
            </>
          ) : (
            <span>
              {preview
                ? `Confirmar e Disparar (${preview.total_validos})`
                : 'Disparar Lembretes'}
            </span>
          )}
        </button>

        {arquivo && !carregando ? (
          <button
            type="button"
            onClick={limparEstadoArquivo}
            className="text-sm text-navy-500 underline dark:text-navy-300"
          >
            Escolher outra planilha
          </button>
        ) : null}
      </div>
    </div>
  );
}
