
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Order = require('../models/Order');

// Ativa automaticamente os leilões cujo horário de início chegou.
async function ativarLeiloes(io) {
  const agora = new Date();

  const leiloes = await Auction.find({
    estado: 'agendado',
    iniciaEm: { $lte: agora },
    terminaEm: { $gt: agora }
  }).select('_id');

  for (const leilao of leiloes) {
    const ativado = await Auction.findOneAndUpdate(
      {
        _id: leilao._id,
        estado: 'agendado',
        iniciaEm: { $lte: agora },
        terminaEm: { $gt: agora }
      },
      {
        $set: { estado: 'ativo' }
      },
      { new: true }
    );

    if (ativado) {
      io.to(`leilao:${ativado._id}`).emit('iniciado', {
        leilaoId: ativado._id,
        estado: 'ativo'
      });

      console.log(`Leilão iniciado: ${ativado._id}`);
    }
  }
}

// Encerra automaticamente os leilões cujo horário terminou.
async function encerrarLeiloes(io) {
  const agora = new Date();

  const leiloes = await Auction.find({
    estado: { $in: ['agendado', 'ativo'] },
    terminaEm: { $lte: agora }
  });

  for (const leilao of leiloes) {
    try {
      const compradorId = leilao.licitacaoAtual?.comprador;
      const valorFinal = Number(leilao.licitacaoAtual?.valor);

      // Sem comprador vencedor: encerra sem criar encomenda.
      if (!compradorId) {
        const encerrado = await Auction.findOneAndUpdate(
          {
            _id: leilao._id,
            estado: { $in: ['agendado', 'ativo'] },
            terminaEm: { $lte: agora }
          },
          { $set: { estado: 'terminado' } },
          { new: true }
        );

        if (encerrado) {
          io.to(`leilao:${leilao._id}`).emit('terminado', {
            leilaoId: leilao._id,
            vencedor: null,
            valorFinal: null
          });

          io.to(`user:${leilao.produtor}`).emit('leilao-terminado', {
            leilaoId: leilao._id,
            mensagem: 'O leilão terminou sem licitações.'
          });
        }

        continue;
      }

      // Confere se existe um lance vencedor registrado.
      const lance = await Bid.findOne({
        leilao: leilao._id,
        comprador: compradorId,
        valor: valorFinal
      });

      if (!lance) {
        console.error(`Lance vencedor não encontrado: ${leilao._id}`);
        continue;
      }

      const nomeLote = leilao.quantidade
        ? `${leilao.lote} (Quantidade: ${leilao.quantidade})`
        : leilao.lote;

      // Cria a encomenda. O índice único impede duplicação.
      try {
        await Order.create({
          leilao: leilao._id,
          comprador: compradorId,
          produtor: leilao.produtor,
          linhas: [{
            produto: leilao.produto || undefined,
            nome: nomeLote,
            precoUnit: valorFinal,
            quantidade: 1
          }],
          estado: 'pendente',
          entrega: { tipo: 'levantamento' }
        });
      } catch (erro) {
        // Se já existir, aproveita a encomenda criada anteriormente.
        if (erro.code !== 11000) {
          throw erro;
        }

        const existente = await Order.findOne({
          leilao: leilao._id
        });

        if (!existente) {
          throw erro;
        }
      }

      // Só um processo consegue efetivar o encerramento.
      const encerrado = await Auction.findOneAndUpdate(
        {
          _id: leilao._id,
          estado: { $in: ['agendado', 'ativo'] },
          terminaEm: { $lte: agora }
        },
        { $set: { estado: 'terminado' } },
        { new: true }
      );

      if (!encerrado) continue;

      const notificacao = {
        leilaoId: leilao._id,
        valorFinal,
        vencedor: compradorId,
        produtor: leilao.produtor
      };

      // Atualiza todos os participantes da sala.
      io.to(`leilao:${leilao._id}`).emit('terminado', notificacao);

      // Notifica o comprador vencedor.
      io.to(`user:${compradorId}`).emit('leilao-ganho', {
        ...notificacao,
        mensagem: 'Você venceu o leilão! Uma encomenda foi criada.'
      });

      // Notifica o produtor.
      io.to(`user:${leilao.produtor}`).emit('leilao-terminado', {
        ...notificacao,
        mensagem: 'Seu leilão terminou e uma encomenda foi criada.'
      });

      console.log(`Leilão encerrado: ${leilao._id}`);
    } catch (erro) {
      console.error(
        `Erro ao encerrar leilão ${leilao._id}:`,
        erro.message
      );
    }
  }
}

// Executa a verificação imediatamente e depois a cada 5 segundos.
function iniciarCicloLeiloes(io) {
  const executar = async () => {
    try {
      await ativarLeiloes(io);
      await encerrarLeiloes(io);
    } catch (erro) {
      console.error('Erro no ciclo de leilões:', erro.message);
    }
  };

  executar();

  setInterval(executar, 5000);
}

module.exports = iniciarCicloLeiloes;