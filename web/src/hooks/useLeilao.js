
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api } from '../api/client.js';

export function useLeilao(id, token) {
  const socketRef = useRef(null);

  const [leilao, setLeilao] = useState(null);
  const [atual, setAtual] = useState(null);
  const [licitacoes, setLicitacoes] = useState([]);
  const [participantes, setParticipantes] = useState(0);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!token || !id) return undefined;

    let ativo = true;

    async function carregarHistorico() {
      try {
        const dados = await api(`/auctions/${id}/bids`);

        if (ativo) {
          setLicitacoes(dados);
        }
      } catch (e) {
        if (ativo) {
          setErro(`Não foi possível carregar o histórico: ${e.message}`);
        }
      }
    }

    const socket = io(API_URL, {
      auth: { token },
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on('estado', (dados) => {
      setLeilao(dados);
      setAtual(dados.licitacaoAtual);
      setErro('');
      setCarregando(false);

      carregarHistorico();
    });

    socket.on('nova-licitacao', (dados) => {
  setAtual(dados);
  carregarHistorico();
});
    socket.on('presenca', setParticipantes);

    socket.on('recusada', (mensagem) => {
      setErro(mensagem);
    });

    socket.on('connect_error', (e) => {
      setErro(e.message);
      setCarregando(false);
    });

    socket.on('connect', () => {
      socket.emit('entrar', id);
    });

    socket.connect();

    return () => {
      ativo = false;
      socket.emit('sair', id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, token]);

  const licitar = (valor) => {
    setErro('');
    socketRef.current?.emit('licitar', {
      leilaoId: id,
      valor
    });
  };

  return {
    leilao,
    atual,
    licitacoes,
    participantes,
    erro,
    carregando,
    licitar
  };
}