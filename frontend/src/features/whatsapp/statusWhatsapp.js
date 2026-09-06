export function statusWhatsappConectado(data) {
  const estado = String(data?.state || data?.instance?.state || '').toLowerCase();
  return data?.conectado === true || estado === 'open' || estado === 'connected';
}
