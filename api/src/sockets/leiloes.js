
const mongoose = require('mongoose');

const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

const sala = (leilaoId) => `leilao:${leilaoId}`;

function emitirPresenca(io, leilaoId) {
  const n = io.sockets.adapter.rooms.get(sala(leilaoId))?.size ?? 0;
  io.to(sala(leilaoId)).emit('presenca', n);
}

module.exports = (io, socket) => {
  // Entrar na sala de um leilão
  socket.on('entrar', async (leilaoId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(leilaoId)) {
        return socket.emit('recusada', 'ID do leilão inválido');
      }

      const leilao = await Auction.findById(leilaoId)
        .populate('produtor', 'nome produtor.nomeExploracao')
        .populate('produto', 'nome imagemUrl');

      if (!leilao) {
        return socket.emit('recusada', 'Leilão não encontrado');
      }

      await socket.join(sala(leilaoId));

      socket.emit('estado', leilao);
      emitirPresenca(io, leilaoId);
    } catch (err) {
      socket.emit('recusada', 'Não foi possível entrar no leilão');
    }
  });

  // Sair da sala
  socket.on('sair', async (leilaoId) => {
    if (!mongoose.Types.ObjectId.isValid(leilaoId)) return;

    await socket.leave(sala(leilaoId));
    emitirPresenca(io, leilaoId);
  });

  // Realizar uma licitação
  socket.on('licitar', async (dados = {}) => {
    try {
      const { leilaoId, valor } = dados;

      if (socket.user.papel !== 'comprador') {
        return socket.emit(
          'recusada',
          'Apenas compradores podem licitar'
        );
      }

      if (!mongoose.Types.ObjectId.isValid(leilaoId)) {
        return socket.emit('recusada', 'ID do leilão inválido');
      }

      const oferta = Number(valor);

      if (!Number.isFinite(oferta) || oferta <= 0) {
        return socket.emit('recusada', 'Valor da licitação inválido');
      }

      const agora = new Date();

      // Atualização atômica: só aceita a oferta se cumprir
      // todas as condições no momento da operação.
      const leilao = await Auction.findOneAndUpdate(
        {
          _id: leilaoId,
          estado: { $in: ['agendado', 'ativo'] },
          iniciaEm: { $lte: agora },
          terminaEm: { $gt: agora },
          produtor: { $ne: socket.user.id },
          $expr: {
            $gte: [
              oferta,
              {
                $add: [
                  '$licitacaoAtual.valor',
                  '$incremento'
                ]
              }
            ]
          }
        },
        {
          $set: {
            'licitacaoAtual.valor': oferta,
            'licitacaoAtual.comprador': socket.user.id,
            estado: 'ativo'
          }
        },
        { new: true }
      );

      if (!leilao) {
        return socket.emit(
          'recusada',
          'Licitação recusada: verifique o valor mínimo e o estado do leilão'
        );
      }

      // Registra a oferta no histórico
      const licitacao = await Bid.create({
        leilao: leilaoId,
        comprador: socket.user.id,
        valor: oferta
      });

      // Notifica todos os participantes da sala
      io.to(sala(leilaoId)).emit('nova-licitacao', {
        leilaoId,
        valor: licitacao.valor,
        comprador: socket.user.id,
        createdAt: licitacao.createdAt
      });
    } catch (err) {
      socket.emit(
        'recusada',
        'Não foi possível processar a licitação'
      );
    }
  });

  // Atualizar presença quando alguém fecha a página
  socket.on('disconnecting', () => {
    for (const s of socket.rooms) {
      if (s.startsWith('leilao:')) {
        setImmediate(() => {
          emitirPresenca(io, s.slice('leilao:'.length));
        });
      }
    }
  });
};