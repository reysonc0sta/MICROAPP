import React, { useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  WifiOff,
  Users,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  MessageSquareText,
  Phone,
  MoreVertical,
} from 'lucide-react';
import { statusWhatsappConectado } from './statusWhatsapp';

const POR_PAGINA = 10;
const LIMITE_MAX = 2000;
const EXEMPLO_NOME = 'João';
const EXEMPLO_FALTAS = 2;
const TEMPLATE_PADRAO =
  'Olá, {nome}! Notamos que você possui {faltas} falta(s) registrada(s). ' +
  'Lembrando que esta é a última semana para realizar a reposição do mês!';

function primeiroNome(nome) {
  const parte = String(nome || '').trim().split(/\s+/)[0] || '';
  if (!parte) return '';
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
}

function renderizarMensagem(template, nome, faltas) {
  if (!template) return '';
  return template
    .replaceAll('{nome}', primeiroNome(nome) || EXEMPLO_NOME)
    .replaceAll('{faltas}', String(faltas ?? 0));
}

function horarioAtual() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const estilos = {
    Pendente:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
    Enviando:
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200',
    Enviado:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    Falha:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300',
  };

  return (
    <span className={`badge ${estilos[status] || estilos.Pendente}`}>
      {status === 'Enviando' ? <Loader2 size={11} className="animate-spin" /> : null}
      {status === 'Enviado' ? <CheckCircle size={11} /> : null}
      {status === 'Falha' ? <PhoneOff size={11} /> : null}
      {status}
    </span>
  );
}

function statusCandidato(candidato, { carregando, disparado }) {
  if (!candidato.valido) return 'Falha';
  if (carregando) return 'Enviando';
  if (disparado) return 'Enviado';
  return 'Pendente';
}

function chaveCandidato(candidato) {
  return `${candidato.nome}|${candidato.numero || ''}|${candidato.faltas}`;
}

function PreviewWhatsApp({ nome, faltas, texto, usandoExemplo }) {
  const horario = useMemo(() => horarioAtual(), [texto]);
  const inicial = (nome || EXEMPLO_NOME).charAt(0).toUpperCase();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Pré-visualização
        </p>
        <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
          Como a mensagem aparece no WhatsApp
        </p>
      </div>

      <div className="bg-[#0b141a] p-3 sm:p-4">
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
          <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white dark:bg-[#1f2c34]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{nome}</p>
              <p className="truncate text-[11px] text-white/80">online</p>
            </div>
            <Phone size={16} className="opacity-80" />
            <MoreVertical size={16} className="opacity-80" />
          </div>

          <div className="relative min-h-[220px] bg-[#e5ddd5] px-3 py-4 dark:bg-[#0b141a]">
            <div className="relative z-10 flex justify-end">
              <div className="relative max-w-[88%]">
                <div className="rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm dark:bg-[#005c4b]">
                  <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef]">
                    {texto || (
                      <span className="italic text-slate-500 dark:text-white/50">
                        Digite a mensagem para ver a prévia...
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <span className="text-[10px] text-[#667781] dark:text-white/50">{horario}</span>
                    <svg viewBox="0 0 16 11" width="16" height="11" className="text-[#53bdeb]" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M11.071.653a.75.75 0 0 0-1.06 1.06l3.182 3.182a.75.75 0 0 0 1.061 0l.53-.53a.75.75 0 0 0-1.06-1.061l-.177.177L11.071.653ZM7.95 3.774a.75.75 0 1 0-1.06 1.06l3.182 3.183a.75.75 0 0 0 1.06 0l3.183-3.182a.75.75 0 0 0-1.061-1.061L10.6 6.426 7.95 3.774ZM4.828 6.896a.75.75 0 1 0-1.06 1.06l3.182 3.183a.75.75 0 0 0 1.06 0l.531-.53a.75.75 0 1 0-1.061-1.061l-.177.177-2.475-2.475Z"
                      />
                    </svg>
                  </div>
                </div>
                <span
                  className="absolute -right-1.5 top-0 h-3 w-3 bg-[#d9fdd3] dark:bg-[#005c4b]"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                  aria-hidden
                />
              </div>
            </div>

            <div className="relative z-10 mt-4 rounded-lg bg-white/80 px-3 py-2 text-center text-[11px] text-slate-600 backdrop-blur-sm dark:bg-white/5 dark:text-slate-300">
              {usandoExemplo ? (
                <>
                  Exemplo com <strong>{nome}</strong> e <strong>{faltas} falta(s)</strong>
                </>
              ) : (
                <>
                  Mensagem para <strong>{nome}</strong> com <strong>{faltas} falta(s)</strong>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportarPlanilha({ whatsappConectado, onIrParaConexao }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [template, setTemplate] = useState('');
  const [salvandoMsg, setSalvandoMsg] = useState(false);
  const [msgSalva, setMsgSalva] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        const { data } = await api.get('/configuracoes/mensagem');
        setTemplate(data.template);
      } catch {
        setTemplate(TEMPLATE_PADRAO);
      }
    };
    carregar();
  }, []);

  useEffect(() => {
    if (!preview) {
      setAlunoSelecionado(null);
      return;
    }
    const primeiroValido = (preview.candidatos || []).find((c) => c.valido);
    setAlunoSelecionado(primeiroValido || null);
  }, [preview]);

  const limparEstadoArquivo = () => {
    setArquivo(null);
    setPreview(null);
    setResultado(null);
    setAlunoSelecionado(null);
    setPagina(1);
    setInputKey((k) => k + 1);
  };

  const carregarPreview = async (file) => {
    setCarregandoPreview(true);
    setErro('');
    setPreview(null);
    setResultado(null);
    setPagina(1);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/whatsapp/preview-planilha', formData, {
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
    carregarPreview(file);
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

  const handleSalvarMensagem = async () => {
    if (!template.includes('{nome}')) {
      setErro('A mensagem precisa incluir a variável {nome}.');
      return;
    }

    setSalvandoMsg(true);
    setErro('');
    setMsgSalva('');
    try {
      const { data } = await api.put('/configuracoes/mensagem', { template });
      setTemplate(data.template);
      setMsgSalva('Mensagem salva com sucesso.');
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao salvar a mensagem.'));
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

    if (!template.includes('{nome}')) {
      setErro('A mensagem precisa incluir a variável {nome}.');
      return;
    }

    setCarregando(true);
    setErro('');
    setResultado(null);
    setMsgSalva('');

    try {
      await api.put('/configuracoes/mensagem', { template });

      const status = await api.get('/whatsapp/status');
      if (!statusWhatsappConectado(status.data)) {
        setErro('WhatsApp desconectado. Conecte o aparelho pelo QR Code antes de disparar mensagens.');
        return;
      }

      const formData = new FormData();
      formData.append('file', arquivo);

      const response = await api.post('/whatsapp/upload-planilha', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(response.data);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao processar a planilha.'));
    } finally {
      setCarregando(false);
    }
  };

  const candidatos = preview?.candidatos || [];
  const totalPaginas = Math.max(1, Math.ceil(candidatos.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const paginaAtual = candidatos.slice(inicio, inicio + POR_PAGINA);
  const dropzoneAtiva = whatsappConectado && !carregandoPreview && !carregando;
  const temNome = template.includes('{nome}');
  const acimaLimite = template.length > LIMITE_MAX;

  const usandoExemplo = !alunoSelecionado;
  const nomePreview = alunoSelecionado?.nome || EXEMPLO_NOME;
  const faltasPreview = alunoSelecionado?.faltas ?? EXEMPLO_FALTAS;
  const textoPreview = renderizarMensagem(template, nomePreview, faltasPreview);
  const chaveSelecionada = alunoSelecionado ? chaveCandidato(alunoSelecionado) : null;

  return (
    <div className="notranslate w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-navy-600 dark:text-navy-300" />
            Disparar Faltas
          </h2>
          <p className="page-subtitle mt-1">
            Envie a planilha, ajuste a mensagem, revise a prévia e confirme o disparo em massa.
            Somente alunos com 2 ou mais faltas recebem a mensagem.
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
            <strong>WhatsApp desconectado.</strong> Conecte o aparelho pelo QR Code para liberar o
            envio da planilha.{' '}
            {onIrParaConexao ? (
              <button type="button" onClick={onIrParaConexao} className="font-semibold underline">
                Ir para Conectar WhatsApp
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (dropzoneAtiva) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all sm:p-14 ${
          arrastando
            ? 'border-navy-500 bg-navy-50/80 dark:border-navy-400 dark:bg-navy-950/40'
            : dropzoneAtiva
              ? 'cursor-pointer border-slate-300 bg-white/70 hover:border-navy-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-navy-500'
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800 text-white shadow-sm dark:bg-navy-600">
          <Upload size={24} />
        </div>
        <p className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {arquivo ? arquivo.name : 'Arraste a planilha aqui ou clique para selecionar'}
        </p>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Formatos suportados: Excel (.xlsx, .xls)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareText size={18} className="text-navy-600 dark:text-navy-300" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Mensagem que será enviada
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Edite o texto abaixo. Use as variáveis{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">{'{nome}'}</code> e{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">{'{faltas}'}</code>
            {preview ? ' — clique em um aluno da lista para ver a versão personalizada.' : '.'}
          </p>
          <textarea
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setMsgSalva('');
              setErro('');
            }}
            rows={8}
            maxLength={LIMITE_MAX + 50}
            className="field min-h-[180px] resize-y font-mono text-sm leading-relaxed"
            placeholder="Olá, {nome}! Você possui {faltas} falta(s)..."
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={acimaLimite ? 'text-red-600 dark:text-red-400' : ''}>
              {template.length} / {LIMITE_MAX}
            </span>
            {!temNome ? (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <AlertCircle size={12} />
                Inclua {'{nome}'} para disparar
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSalvarMensagem}
              disabled={salvandoMsg || !temNome || acimaLimite}
              className="ml-auto text-navy-700 underline disabled:opacity-40 dark:text-navy-200"
            >
              {salvandoMsg ? 'Salvando...' : 'Salvar mensagem'}
            </button>
            {msgSalva ? <span className="text-emerald-600 dark:text-emerald-400">{msgSalva}</span> : null}
          </div>
        </div>

        <PreviewWhatsApp
          nome={primeiroNome(nomePreview) || EXEMPLO_NOME}
          faltas={faltasPreview}
          texto={textoPreview}
          usandoExemplo={usandoExemplo}
        />
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
          <span>Lendo a planilha para pré-visualização...</span>
        </div>
      ) : null}

      {preview ? (
        <div className="card space-y-4 !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
            <span className="badge border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              <Users size={12} />
              {preview.total_linhas} aluno(s) com falta
            </span>
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle size={12} />
              {preview.total_validos} receberão mensagem
            </span>
            {preview.total_invalidos > 0 ? (
              <span className="badge border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                <PhoneOff size={12} />
                {preview.total_invalidos} sem telefone válido
              </span>
            ) : null}
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Faltas</th>
                  <th className="px-4 py-3 font-semibold">Telefone</th>
                  <th className="px-4 py-3 font-semibold">Canal</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginaAtual.map((candidato, index) => {
                  const status = statusCandidato(candidato, {
                    carregando,
                    disparado: Boolean(resultado),
                  });
                  const selecionado = chaveSelecionada === chaveCandidato(candidato);
                  return (
                    <tr
                      key={`${candidato.nome}-${(pagina - 1) * POR_PAGINA + index}`}
                      onClick={() => {
                        if (candidato.valido) setAlunoSelecionado(candidato);
                      }}
                      className={`transition ${
                        candidato.valido ? 'cursor-pointer' : ''
                      } ${
                        selecionado
                          ? 'bg-navy-50/80 dark:bg-navy-950/40'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6 dark:text-slate-100">
                        {candidato.nome}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{candidato.faltas}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {candidato.numero || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {candidato.canal ? (
                          <span className="inline-flex items-center gap-1">
                            {candidato.canal === 'PESSOAL' ? 'Pessoal' : 'Comercial'}
                            {candidato.usou_fallback ? (
                              <span className="text-xs text-amber-600 dark:text-amber-400">(fallback)</span>
                            ) : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={status} />
                          {!candidato.valido && candidato.motivo_invalido ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {candidato.motivo_invalido}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Página {pagina} de {totalPaginas} · {candidatos.length} registro(s)
              {preview.total_validos > 0 ? ' · clique em um aluno para pré-visualizar a mensagem' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
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
              <>
                {' '}
                | Status: <strong>em segundo plano</strong> (histórico gravado no banco)
              </>
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
          disabled={
            !preview ||
            preview.total_validos === 0 ||
            carregando ||
            carregandoPreview ||
            !whatsappConectado ||
            !temNome ||
            acimaLimite
          }
          className="btn-primary sm:w-auto sm:min-w-[240px]"
        >
          {carregando ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Processando Planilha...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>
                {preview
                  ? `Confirmar e Disparar (${preview.total_validos})`
                  : 'Iniciar Disparos Automáticos'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
