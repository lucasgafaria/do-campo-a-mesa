
const router = require('express').Router();
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const produtorValidado = require('../middleware/produtorValidado');

const Auction = require('../models/Auction');
const Product = require('../models/Product');
const Bid = require('../models/Bid');

// POST /api/auctions
// Criar leilão (produtor validado)
router.post('/', auth('produtor'), produtorValidado, async (req, res, next) => {
  try {
    const {
      produto,
      lote,
      quantidade,
      precoBase,
      incremento,
      iniciaEm,
      duracaoMinutos
    } = req.body;

    if (!lote || typeof lote !== 'string' || !lote.trim()) {
      return res.status(400).json({
        erro: 'A descrição do lote é obrigatória'
      });
    }

    const preco = Number(precoBase);
    const valorIncremento = Number(incremento);
    const duracao = Number(duracaoMinutos);
    const inicio = new Date(iniciaEm);

    if (!Number.isFinite(preco) || preco < 0) {
      return res.status(400).json({
        erro: 'O preço-base deve ser um número igual ou superior a zero'
      });
    }

    if (!Number.isFinite(valorIncremento) || valorIncremento < 0.01) {
      return res.status(400).json({
        erro: 'O incremento mínimo deve ser de pelo menos 0,01'
      });
    }

    if (!Number.isInteger(duracao) || duracao <= 0) {
      return res.status(400).json({
        erro: 'A duração deve ser um número inteiro de minutos positivo'
      });
    }

    if (!iniciaEm || Number.isNaN(inicio.getTime())) {
      return res.status(400).json({
        erro: 'A data de início é inválida'
      });
    }

    const terminaEm = new Date(inicio.getTime() + duracao * 60 * 1000);
    const agora = new Date();

    if (terminaEm <= agora) {
      return res.status(400).json({
        erro: 'O término do leilão deve ser uma data futura'
      });
    }

    let produtoId;

    if (produto) {
      if (!mongoose.Types.ObjectId.isValid(produto)) {
        return res.status(400).json({
          erro: 'ID do produto inválido'
        });
      }

      const produtoEncontrado = await Product.findOne({
        _id: produto,
        produtor: req.user.id
      });

      if (!produtoEncontrado) {
        return res.status(404).json({
          erro: 'Produto não encontrado na sua conta'
        });
      }

      produtoId = produtoEncontrado._id;
    }

    const leilao = await Auction.create({
      produtor: req.user.id,
      produto: produtoId,
      lote: lote.trim(),
      quantidade: quantidade?.trim(),
      precoBase: preco,
      incremento: valorIncremento,
      licitacaoAtual: {
        valor: preco
      },
      iniciaEm: inicio,
      terminaEm,
      estado: inicio > agora ? 'agendado' : 'ativo'
    });

    return res.status(201).json({
      mensagem: 'Leilão criado com sucesso',
      leilao
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auctions?estado=ativo
// Listar leilões com filtro opcional por estado
router.get('/', async (req, res, next) => {
  try {
    const agora = new Date();

    const { estado } = req.query;
    const filtro = {};

    if (estado) {
      const estadosValidos = ['agendado', 'ativo', 'terminado'];

      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          erro: 'Estado inválido'
        });
      }

      filtro.estado = estado;
    }

    const leiloes = await Auction.find(filtro)
      .populate('produtor', 'nome produtor.nomeExploracao')
      .populate('produto', 'nome imagemUrl')
      .sort({ iniciaEm: 1 });

    return res.status(200).json(leiloes);
  } catch (err) {
    next(err);
  }
});

// GET /api/auctions/:id
// Consultar detalhes de um leilão
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        erro: 'ID do leilão inválido'
      });
    }

    const leilao = await Auction.findById(id)
      .populate('produtor', 'nome email produtor.nomeExploracao produtor.localidade')
      .populate('produto', 'nome categoria preco unidade imagemUrl');

    if (!leilao) {
      return res.status(404).json({
        erro: 'Leilão não encontrado'
      });
    }

    return res.status(200).json(leilao);
  } catch (err) {
    next(err);
  }
});

// GET /api/auctions/:id/bids
// Consultar histórico de licitações
router.get('/:id/bids', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        erro: 'ID do leilão inválido'
      });
    }

    const leilao = await Auction.findById(id);

    if (!leilao) {
      return res.status(404).json({
        erro: 'Leilão não encontrado'
      });
    }

    const licitacoes = await Bid.find({ leilao: id })
      .populate('comprador', 'nome')
      .sort({ createdAt: -1 });

    return res.status(200).json(licitacoes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;