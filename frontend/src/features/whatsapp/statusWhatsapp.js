export function statusWhatsappConectado(data) {
  const estado = String(data?.state || data?.instance?.state || '').toLowerCase();
  return data?.conectado === true || estado === 'open' || estado === 'connected';
}

export function chaveStatusWhatsapp(usuarioId) {
  return usuarioId ? `whatsapp_status_${usuarioId}` : 'whatsapp_status';
}

export function lerStatusWhatsapp(usuarioId) {
  return localStorage.getItem(chaveStatusWhatsapp(usuarioId)) || 'DISCONNECTED';
}

export function gravarStatusWhatsapp(usuarioId, status) {
  localStorage.setItem(chaveStatusWhatsapp(usuarioId), status);
}

export function limparStatusWhatsapp(usuarioId) {
  if (usuarioId) {
    localStorage.removeItem(chaveStatusWhatsapp(usuarioId));
  }
  localStorage.removeItem('whatsapp_status');
}
