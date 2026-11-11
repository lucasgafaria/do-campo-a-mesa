
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useNotificacoes() {
  const { token } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);

  useEffect(() => {
    if (!token) {
      setNotificacoes([]);
      return undefined;
    }

    const socket = io(API_URL, {
      auth: { token }
    });

    socket.on('encomenda-atualizada', (dados) => {
      setNotificacoes((atuais) => [
        {
          id: `${dados.id}-${Date.now()}`,
          encomendaId: dados.id,
          estado: dados.estado,
          mensagem: `A sua encomenda foi atualizada para: ${dados.estado}`
        },
        ...atuais
      ]);
    });

    return () => socket.disconnect();
  }, [token]);

  function limparNotificacoes() {
    setNotificacoes([]);
  }

  return { notificacoes, limparNotificacoes };
}