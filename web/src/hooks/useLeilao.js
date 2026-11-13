
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
  const [encerramento, setEncerramento] = useState(null);

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

    // Atualiza a sala quando o servidor inicia o leilão.
    socket.on('iniciado', () => {
      setLeilao((anterior) => anterior
        ? { ...anterior, estado: 'ativo' }
        : anterior
      );
    });

    socket.on('terminado', (dados) => {
      setEncerramento(dados);

      setLeilao((anterior) => anterior
        ? { ...anterior, estado: 'terminado' }
        : anterior
      );
    });

    socket.on('leilao-ganho', (dados) => {
      setEncerramento(dados);
    });

    socket.on('leilao-terminado', (dados) => {
      setEncerramento(dados);
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

    if (!socketRef.current?.connected) {
      setErro('Conexão com o leilão indisponível.');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      socketRef.current.emit(
        'licitar',
        { leilaoId: id, valor },
        (resposta) => {
          if (!resposta?.sucesso) {
            setErro(
              resposta?.mensagem || 'Não foi possível registrar a oferta.'
            );
            resolve(false);
            return;
          }

          resolve(true);
        }
      );
    });
  };

  return {
    leilao,
    atual,
    licitacoes,
    participantes,
    erro,
    carregando,
    encerramento,
    licitar
  };
}