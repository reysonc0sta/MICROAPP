import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { limparStatusWhatsapp } from '../features/whatsapp/statusWhatsapp';

function idUsuarioNoStorage() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null')?.id;
  } catch {
    return undefined;
  }
}

export function useSessao() {
  const [usuario, setUsuario] = useState(null);
  const [validandoSessao, setValidandoSessao] = useState(true);

  const logout = useCallback(() => {
    limparStatusWhatsapp(idUsuarioNoStorage());
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  const definirUsuario = useCallback((proximo) => {
    setUsuario(proximo);
  }, []);

  useEffect(() => {
    const onAuthLogout = () => logout();
    window.addEventListener('auth:logout', onAuthLogout);
    return () => window.removeEventListener('auth:logout', onAuthLogout);
  }, [logout]);

  useEffect(() => {
    const restaurarSessao = async () => {
      const token = localStorage.getItem('token');
      const raw = localStorage.getItem('usuario');

      if (!token || !raw) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setValidandoSessao(false);
        return;
      }

      try {
        JSON.parse(raw);
        const { data } = await api.get('/usuarios/me');
        localStorage.setItem('usuario', JSON.stringify(data));
        setUsuario(data);
      } catch {
        logout();
      } finally {
        setValidandoSessao(false);
      }
    };

    restaurarSessao();
  }, [logout]);

  return { usuario, validandoSessao, definirUsuario, logout };
}
