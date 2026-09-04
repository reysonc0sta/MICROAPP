export function formatarTelefoneExibicao(numero) {
    if (!numero) return 'Não cadastrado';
    const limpo = String(numero).replace(/\D/g, '');
    if (limpo.length === 11) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
    }
    return numero;
  }