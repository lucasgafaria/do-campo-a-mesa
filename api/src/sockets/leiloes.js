
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
  
  socket.on('licitar', async (dados = {}, confirmar) => {
    const responder = (resultado) => {
      if (typeof confirmar === 'function') {
        confirmar(resultado);
      }
    };

    try {
      const { leilaoId, valor } = dados;

      if (socket.user.papel !== 'comprador') {
        const mensagem = 'Apenas compradores podem licitar';
        responder({ sucesso: false, mensagem });
        return socket.emit('recusada', mensagem);
      }

      if (!mongoose.Types.ObjectId.isValid(leilaoId)) {
        const mensagem = 'ID do leilão inválido';
        responder({ sucesso: false, mensagem });
        return socket.emit('recusada', mensagem);
      }

      const oferta = Number(valor);

      if (!Number.isFinite(oferta) || oferta <= 0) {
        const mensagem = 'Valor da licitação inválido';
        responder({ sucesso: false, mensagem });
        return socket.emit('recusada', mensagem);
      }

      const agora = new Date();

      // Atualização atômica: verifica todas as condições no banco.
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
        const mensagem =
          'Licitação recusada: verifique o valor mínimo e o estado do leilão';

        responder({ sucesso: false, mensagem });
        return socket.emit('recusada', mensagem);
      }

      const licitacao = await Bid.create({
        leilao: leilaoId,
        comprador: socket.user.id,
        valor: oferta
      });

      const resultado = {
        leilaoId,
        valor: licitacao.valor,
        comprador: socket.user.id,
        createdAt: licitacao.createdAt
      };

      io.to(sala(leilaoId)).emit('nova-licitacao', resultado);

      responder({
        sucesso: true,
        mensagem: 'Licitação aceita',
        licitacao: resultado
      });

    } catch (err) {
      console.error('Erro ao processar licitação:', err.message);

      const mensagem = 'Não foi possível processar a licitação';

      responder({ sucesso: false, mensagem });
      socket.emit('recusada', mensagem);
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