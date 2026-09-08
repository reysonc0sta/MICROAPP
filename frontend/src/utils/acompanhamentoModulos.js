export const CONFIG_PADRAO = {
  aulasPorSemana: 2,
  aulasPorModulo: 16,
  mensalidadesPorModulo: 2,
  valorReposicao: 20,
};

export function formatarMoedaBRL(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'R$ 0,00';
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatarNumero(valor, casas = 1) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '0';
  if (Number.isInteger(numero)) return String(numero);
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

/**
 * Calcula a análise de acompanhamento de módulos (calculadora local, sem persistência).
 */
export function calcularAcompanhamento({
  nome = '',
  parcelasPagas = 0,
  moduloAtual = 0,
  totalModulos = 0,
  faltas = 0,
  aulasPorSemana = CONFIG_PADRAO.aulasPorSemana,
  aulasPorModulo = CONFIG_PADRAO.aulasPorModulo,
  mensalidadesPorModulo = CONFIG_PADRAO.mensalidadesPorModulo,
  valorReposicao = CONFIG_PADRAO.valorReposicao,
} = {}) {
  const erros = [];

  const parcelas = Number(parcelasPagas) || 0;
  const modulo = Number(moduloAtual) || 0;
  const total = Number(totalModulos) || 0;
  const qtdFaltas = Number(faltas) || 0;
  const aulasSemana = Number(aulasPorSemana);
  const aulasModulo = Number(aulasPorModulo);
  const mensalidadesModulo = Number(mensalidadesPorModulo);
  const valorRep = Number(valorReposicao);

  if (parcelas < 0) erros.push('Parcelas pagas não podem ser negativas.');
  if (modulo < 0) erros.push('Módulo atual não pode ser negativo.');
  if (total < 0) erros.push('Total de módulos não pode ser negativo.');
  if (qtdFaltas < 0) erros.push('Faltas não podem ser negativas.');
  if (!Number.isFinite(aulasSemana) || aulasSemana <= 0) {
    erros.push('Aulas por semana devem ser maiores que zero.');
  }
  if (!Number.isFinite(aulasModulo) || aulasModulo <= 0) {
    erros.push('Aulas por módulo devem ser maiores que zero.');
  }
  if (!Number.isFinite(mensalidadesModulo) || mensalidadesModulo <= 0) {
    erros.push('Mensalidades por módulo devem ser maiores que zero.');
  }
  if (!Number.isFinite(valorRep) || valorRep < 0) {
    erros.push('Valor da reposição não pode ser negativo.');
  }

  if (erros.length > 0) {
    return { valido: false, erros };
  }

  const modulosCorrespondentes = parcelas / mensalidadesModulo;
  const diferencaModulos = Math.max(0, modulosCorrespondentes - modulo);
  const semanasReposicao = qtdFaltas / aulasSemana;
  const semanasPorModulo = aulasModulo / aulasSemana;
  const semanasPorMensalidade = semanasPorModulo / mensalidadesModulo;
  const mensalidadesAdicionais =
    semanasPorMensalidade > 0 ? semanasReposicao / semanasPorMensalidade : 0;
  // Escola tipicamente cobra mensalidade inteira: arredonda para cima quando há fração.
  const mensalidadesAdicionaisCeil = Math.ceil(mensalidadesAdicionais);
  const valorReposicoes = qtdFaltas * valorRep;

  let situacao = 'REGULAR';
  const atrasadoNosModulos = modulo < modulosCorrespondentes;
  const temFaltas = qtdFaltas > 0;

  if (atrasadoNosModulos && temFaltas) {
    situacao = 'PENDENTE';
  } else if (atrasadoNosModulos || temFaltas) {
    situacao = 'ATENÇÃO';
  } else {
    situacao = 'REGULAR';
  }

  const explicacao = montarExplicacao({
    parcelas,
    mensalidadesModulo,
    modulosCorrespondentes,
    modulo,
    diferencaModulos,
    qtdFaltas,
    aulasSemana,
    semanasReposicao,
    aulasModulo,
    semanasPorModulo,
    semanasPorMensalidade,
    mensalidadesAdicionais,
  });

  return {
    valido: true,
    erros: [],
    nome: String(nome || '').trim(),
    parcelasPagas: parcelas,
    moduloAtual: modulo,
    totalModulos: total,
    faltas: qtdFaltas,
    aulasPorSemana: aulasSemana,
    aulasPorModulo: aulasModulo,
    mensalidadesPorModulo: mensalidadesModulo,
    valorReposicao: valorRep,
    modulosCorrespondentes,
    diferencaModulos,
    semanasReposicao,
    semanasPorModulo,
    semanasPorMensalidade,
    mensalidadesAdicionais,
    mensalidadesAdicionaisCeil,
    valorReposicoes,
    situacao,
    explicacao,
  };
}

function montarExplicacao({
  parcelas,
  mensalidadesModulo,
  modulosCorrespondentes,
  modulo,
  diferencaModulos,
  qtdFaltas,
  aulasSemana,
  semanasReposicao,
  aulasModulo,
  semanasPorModulo,
  semanasPorMensalidade,
  mensalidadesAdicionais,
}) {
  const linhas = [
    `O aluno possui ${formatarNumero(parcelas)} parcela(s) paga(s).`,
    '',
    `Considerando ${formatarNumero(mensalidadesModulo)} mensalidade(s) por módulo:`,
    `${formatarNumero(parcelas)} ÷ ${formatarNumero(mensalidadesModulo)} = ${formatarNumero(modulosCorrespondentes)} módulo(s).`,
    '',
    `O aluno está no módulo ${formatarNumero(modulo)}.`,
  ];

  if (diferencaModulos > 0) {
    linhas.push(
      `Existe uma diferença de ${formatarNumero(diferencaModulos)} módulo(s) em relação às parcelas pagas.`
    );
  } else {
    linhas.push('O módulo atual está alinhado (ou adiantado) em relação às parcelas pagas.');
  }

  linhas.push('', `O aluno possui ${formatarNumero(qtdFaltas)} falta(s).`);

  if (qtdFaltas > 0) {
    linhas.push(
      '',
      `Considerando ${formatarNumero(aulasSemana)} aula(s) por semana:`,
      `${formatarNumero(qtdFaltas)} ÷ ${formatarNumero(aulasSemana)} = ${formatarNumero(semanasReposicao)} semana(s) de reposição.`,
      '',
      `Considerando um módulo de ${formatarNumero(aulasModulo)} aula(s):`,
      `${formatarNumero(aulasModulo)} ÷ ${formatarNumero(aulasSemana)} = ${formatarNumero(semanasPorModulo)} semana(s) por módulo.`,
      '',
      `Como cada módulo corresponde a ${formatarNumero(mensalidadesModulo)} mensalidade(s):`,
      `${formatarNumero(semanasPorModulo)} ÷ ${formatarNumero(mensalidadesModulo)} = ${formatarNumero(semanasPorMensalidade)} semana(s) por mensalidade.`,
      '',
      `${formatarNumero(semanasReposicao)} ÷ ${formatarNumero(semanasPorMensalidade)} = ${formatarNumero(mensalidadesAdicionais)} mensalidade(s) adicional(is) estimada(s).`
    );
  } else {
    linhas.push('Não há faltas a repor e não há extensão estimada de contrato por faltas.');
  }

  return linhas.join('\n');
}

export function gerarMensagemResponsavel(resultado) {
  if (!resultado?.valido) return '';

  const nome = resultado.nome || '[NOME]';
  const parcelas = formatarNumero(resultado.parcelasPagas);
  const modulo = formatarNumero(resultado.moduloAtual);
  const faltas = formatarNumero(resultado.faltas);
  const semanas = formatarNumero(resultado.semanasReposicao);
  const valor = formatarMoedaBRL(resultado.valorReposicoes);
  const mensalidades = formatarNumero(resultado.mensalidadesAdicionais);

  return [
    `Olá, ${nome}.`,
    '',
    'Realizamos uma verificação da sua situação acadêmica.',
    '',
    `Atualmente constam ${parcelas} parcela(s) paga(s) e o aluno encontra-se no módulo ${modulo}.`,
    '',
    `Também identificamos ${faltas} falta(s), que correspondem aproximadamente a ${semanas} semana(s) de aulas para reposição.`,
    '',
    `Caso opte por realizar as reposições, o valor estimado será de ${valor}.`,
    '',
    `Caso as faltas não sejam repostas, o período contratual poderá ser estendido em aproximadamente ${mensalidades} mensalidade(s), conforme os cálculos apresentados.`,
    '',
    'Caso tenha interesse em realizar as reposições ou queira mais informações, estamos à disposição para orientá-lo.',
    '',
    'Atenciosamente,',
    'Microlins',
  ].join('\n');
}
