import React, { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  MessageSquareText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
  Braces,
  Phone,
  MoreVertical,
  Zap,
} from 'lucide-react';

const TEMPLATE_PADRAO =
  'Olá, {nome}! Notamos que você possui {faltas} falta(s) registrada(s). ' +
  'Lembrando que esta é a última semana para realizar a reposição do mês!';

const PLACEHOLDERS = [
  { tag: '{nome}', label: 'Nome do aluno', descricao: 'Primeiro nome' },
  { tag: '{faltas}', label: 'Quantidade de faltas', descricao: 'Número de faltas' },
];

const EXEMPLO_NOME = 'João';
const EXEMPLO_FALTAS = '2';
const LIMITE_RECOMENDADO = 500;
const LIMITE_MAX = 2000;

function renderizarPreview(template) {
  if (!template) return '';
  return template.replaceAll('{nome}', EXEMPLO_NOME).replaceAll('{faltas}', EXEMPLO_FALTAS);
}

function horarioAtual() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function EditarMensagem() {
  const textareaRef = useRef(null);
  const [template, setTemplate] = useState('');
  const [templateSalvo, setTemplateSalvo] = useState('');
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [horario, setHorario] = useState(horarioAtual);

  const preview = renderizarPreview(template);
  const caracteres = template.length;
  const temNome = template.includes('{nome}');
  const alteracoesPendentes = template !== templateSalvo;
  const acimaRecomendado = caracteres > LIMITE_RECOMENDADO;
  const acimaLimite = caracteres > LIMITE_MAX;

  useEffect(() => {
    const carregar = async () => {
      try {
        const { data } = await api.get('/configuracoes/mensagem');
        setTemplate(data.template);
        setTemplateSalvo(data.template);
      } catch (err) {
        setErro(apiErrorMessage(err, 'Erro ao carregar a mensagem atual.'));
      } finally {
        setCarregandoInicial(false);
      }
    };
    carregar();
  }, []);

  useEffect(() => {
    setHorario(horarioAtual());
  }, [template]);

  const inserirPlaceholder = (tag) => {
    const el = textareaRef.current;
    setErro('');
    setSucesso(false);

    if (!el) {
      setTemplate((atual) => `${atual}${tag}`);
      return;
    }

    const inicio = el.selectionStart ?? template.length;
    const fim = el.selectionEnd ?? template.length;
    const novo = `${template.slice(0, inicio)}${tag}${template.slice(fim)}`;
    const cursor = inicio + tag.length;

    setTemplate(novo);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleSalvar = async () => {
    if (!temNome || acimaLimite) return;

    setSalvando(true);
    setErro('');
    setSucesso(false);

    try {
      const { data } = await api.put('/configuracoes/mensagem', { template });
      setTemplate(data.template);
      setTemplateSalvo(data.template);
      setSucesso(true);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao salvar a mensagem.'));
    } finally {
      setSalvando(false);
    }
  };

  const handleRestaurarPadrao = () => {
    setTemplate(TEMPLATE_PADRAO);
    setErro('');
    setSucesso(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(TEMPLATE_PADRAO.length, TEMPLATE_PADRAO.length);
    });
  };

  if (carregandoInicial) {
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-500 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:shadow-black/20">
        <Loader2 className="animate-spin text-slate-600 dark:text-slate-300" size={18} />
        <span>Carregando template de mensagem...</span>
      </div>
    );
  }

  return (
    <div className="notranslate w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna de edição */}
        <section className="flex flex-col gap-5 lg:col-span-7">
          <header className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MessageSquareText size={18} className="shrink-0" />
                  <span className="text-xs font-semibold tracking-wide uppercase">Templates</span>
                </div>
                <h2 className="bg-gradient-to-r from-slate-900 via-navy-700 to-navy-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl dark:from-white dark:via-slate-100 dark:to-slate-300">
                  Editar Mensagem de Reposição
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                  Personalize o texto enviado automaticamente aos alunos com faltas. Use as variáveis
                  dinâmicas para preencher nome e quantidade de faltas em tempo real.
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  alteracoesPendentes
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    alteracoesPendentes ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                {alteracoesPendentes ? 'Alterações pendentes' : 'Template Ativo'}
              </span>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <Braces size={16} className="text-slate-500 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Variáveis dinâmicas
              </h3>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Clique em uma tag para inserir na posição do cursor.
            </p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map(({ tag, label, descricao }) => (
                <button
                  key={tag}
                  type="button"
                  title={`${label} — ${descricao}`}
                  onClick={() => inserirPlaceholder(tag)}
                  className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm font-medium text-navy-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                >
                  <Zap
                    size={14}
                    className="text-slate-500 transition group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200"
                  />
                  <code className="font-mono text-[13px]">{tag}</code>
                  <span className="hidden text-xs font-normal text-slate-500 sm:inline dark:text-slate-400">
                    {descricao}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <label
                htmlFor="template-mensagem"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-50"
              >
                Texto da mensagem
              </label>
              <span
                className={`text-xs font-medium tabular-nums ${
                  acimaLimite
                    ? 'text-red-600 dark:text-red-400'
                    : acimaRecomendado
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {caracteres} / {LIMITE_RECOMENDADO} recomendado
                <span className="text-slate-400 dark:text-slate-500"> · máx. {LIMITE_MAX}</span>
              </span>
            </div>

            <textarea
              id="template-mensagem"
              ref={textareaRef}
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setErro('');
                setSucesso(false);
              }}
              rows={10}
              maxLength={LIMITE_MAX + 50}
              className="field min-h-[220px] resize-y font-mono text-sm leading-relaxed"
              placeholder="Olá, {nome}! Você possui {faltas} falta(s)..."
            />

            {!temNome ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle size={13} />
                O template precisa incluir a variável {'{nome}'} para ser salvo.
              </p>
            ) : null}

            {acimaRecomendado && !acimaLimite ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Mensagens longas podem ser cortadas em alguns aparelhos. Prefira até{' '}
                {LIMITE_RECOMENDADO} caracteres.
              </p>
            ) : null}

            {erro ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{erro}</span>
              </div>
            ) : null}

            {sucesso ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle size={16} className="shrink-0" />
                <span>Mensagem atualizada com sucesso!</span>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando || !temNome || acimaLimite}
                className="btn-primary sm:w-auto sm:min-w-[200px]"
              >
                {salvando ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRestaurarPadrao}
                disabled={salvando || template === TEMPLATE_PADRAO}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw size={16} />
                <span>Restaurar Padrão</span>
              </button>
            </div>
          </div>
        </section>

        {/* Preview WhatsApp */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Pré-visualização em tempo real
                </p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                  Como a mensagem aparece no WhatsApp
                </p>
              </div>

              <div className="bg-[#0b141a] p-3 sm:p-4">
                <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
                  {/* Header conversa */}
                  <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white dark:bg-[#1f2c34]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                      {EXEMPLO_NOME.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">Preview do Aluno - Exemplo</p>
                      <p className="truncate text-[11px] text-white/80">online</p>
                    </div>
                    <Phone size={16} className="opacity-80" />
                    <MoreVertical size={16} className="opacity-80" />
                  </div>

                  {/* Área do chat */}
                  <div className="relative min-h-[320px] bg-[#e5ddd5] px-3 py-4 dark:bg-[#0b141a]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                      style={{
                        backgroundImage:
                          'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                      }}
                      aria-hidden
                    />

                    <div className="relative z-10 flex justify-end">
                      <div className="relative max-w-[88%]">
                        <div className="rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm dark:bg-[#005c4b]">
                          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#111b21] dark:text-[#e9edef]">
                            {preview || (
                              <span className="italic text-slate-500 dark:text-white/50">
                                Digite a mensagem para ver a prévia...
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <span className="text-[10px] text-[#667781] dark:text-white/50">
                              {horario}
                            </span>
                            <svg
                              viewBox="0 0 16 11"
                              width="16"
                              height="11"
                              className="text-[#53bdeb]"
                              aria-hidden
                            >
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
                      Exemplo com <strong>{EXEMPLO_NOME}</strong> e{' '}
                      <strong>{EXEMPLO_FALTAS} faltas</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
