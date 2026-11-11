
const router = require('express').Router();
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const produtorValidado = require('../middleware/produtorValidado');

// POST /api/orders
// Cria uma encomenda para um único produtor.
router.post('/', auth('comprador'), async (req, res, next) => {
  const reservados = [];

  try {
    const { linhas, entrega = {} } = req.body || {};

    if (!Array.isArray(linhas) || linhas.length === 0) {
      return res.status(400).json({
        erro: 'A encomenda deve conter pelo menos um produto'
      });
    }

    if (linhas.length > 50) {
      return res.status(400).json({
        erro: 'A encomenda nao pode conter mais de 50 produtos'
      });
    }

    const tipoEntrega = entrega.tipo || 'levantamento';

    if (!['levantamento', 'entrega'].includes(tipoEntrega)) {
      return res.status(400).json({
        erro: 'Tipo de entrega invalido'
      });
    }

    if (
      tipoEntrega === 'entrega' &&
      (typeof entrega.morada !== 'string' || !entrega.morada.trim())
    ) {
      return res.status(400).json({
        erro: 'Informe a morada para entrega'
      });
    }

    // Valida os IDs e agrega linhas repetidas.
    const quantidades = new Map();

    for (const linha of linhas) {
      if (
        !linha ||
        !mongoose.isValidObjectId(linha.produto) ||
        !Number.isInteger(linha.quantidade) ||
        linha.quantidade < 1
      ) {
        return res.status(400).json({
          erro: 'Cada linha deve conter um produto valido e uma quantidade inteira positiva'
        });
      }

      const id = String(linha.produto);
      quantidades.set(id, (quantidades.get(id) || 0) + linha.quantidade);
    }

    const ids = [...quantidades.keys()];

    // Confirma que todos os produtos existem.
    const produtos = await Product.find({ _id: { $in: ids } });

    if (produtos.length !== ids.length) {
      return res.status(404).json({
        erro: 'Um ou mais produtos nao foram encontrados'
      });
    }

    // Uma encomenda pertence a um unico produtor.
    const produtorId = String(produtos[0].produtor);

    if (produtos.some(p => String(p.produtor) !== produtorId)) {
      return res.status(400).json({
        erro: 'Separe os produtos de produtores diferentes em encomendas distintas'
      });
    }

    // Confirma que o produtor continua validado.
    const produtor = await User.findOne({
      _id: produtorId,
      papel: 'produtor',
      'produtor.validado': true
    });

    if (!produtor) {
      return res.status(400).json({
        erro: 'O produtor nao esta validado'
      });
    }

    const linhasEncomenda = [];

    // Reserva o stock de cada produto atomicamente.
    try {
      for (const [id, quantidade] of quantidades) {
        const produto = await Product.findOneAndUpdate(
          {
            _id: id,
            produtor: produtorId,
            stock: { $gte: quantidade }
          },
          { $inc: { stock: -quantidade } },
          { new: true, runValidators: true }
        );

        if (!produto) {
          const erro = new Error(
            'Stock insuficiente ou produto indisponivel: ' + id
          );
          erro.status = 409;
          throw erro;
        }

        reservados.push({ id, quantidade });

        linhasEncomenda.push({
          produto: produto._id,
          nome: produto.nome,
          precoUnit: produto.preco,
          quantidade
        });
      }

      const encomenda = await Order.create({
        comprador: req.user.id,
        produtor: produtorId,
        linhas: linhasEncomenda,
        entrega: {
          tipo: tipoEntrega,
          ...(tipoEntrega === 'entrega'
            ? { morada: entrega.morada.trim() }
            : {})
        }
      });

      return res
        .status(201)
        .location(`/api/orders/${encomenda._id}`)
        .json(encomenda);
    } catch (erro) {
      // Se a encomenda falhar, devolve o stock já reservado.
      for (const reserva of reservados) {
        try {
          await Product.updateOne(
            { _id: reserva.id },
            { $inc: { stock: reserva.quantidade } }
          );
        } catch (erroRestauro) {
          console.error(
            'Falha ao restaurar stock do produto:',
            reserva.id,
            erroRestauro
          );
        }
      }

      throw erro;
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/orders
// Lista encomendas do comprador ou do produtor autenticado.
router.get('/', auth('comprador', 'produtor'), async (req, res, next) => {
  try {
    const filtro = req.user.papel === 'produtor'
      ? { produtor: req.user.id }
      : { comprador: req.user.id };

    const encomendas = await Order.find(filtro)
      .populate('produtor', 'nome produtor.nomeExploracao')
      .populate('comprador', 'nome email')
      .populate('linhas.produto', 'nome imagemUrl')
      .sort({ createdAt: -1 });

    res.json(encomendas);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
// Consulta uma encomenda apenas se o utilizador estiver relacionado com ela.
router.get('/:id', auth('comprador', 'produtor'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        erro: 'ID de encomenda invalido'
      });
    }

    const filtro = {
      _id: id,
      ...(req.user.papel === 'produtor'
        ? { produtor: req.user.id }
        : { comprador: req.user.id })
    };

    const encomenda = await Order.findOne(filtro)
      .populate('produtor', 'nome produtor.nomeExploracao')
      .populate('comprador', 'nome email')
      .populate('linhas.produto', 'nome imagemUrl');

    if (!encomenda) {
      return res.status(404).json({
        erro: 'Encomenda nao encontrada'
      });
    }

    res.json(encomenda);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/estado
// O produtor só pode avançar o estado das próprias encomendas.
router.patch('/:id/estado', auth('produtor'), produtorValidado, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        erro: 'ID de encomenda invalido'
      });
    }

    const transicoes = {
      pendente: 'confirmada',
      confirmada: 'pronta',
      pronta: 'entregue'
    };

    if (!Object.values(transicoes).includes(estado)) {
      return res.status(400).json({
        erro: 'Estado de destino invalido'
      });
    }

    const atual = await Order.findOne({
      _id: id,
      produtor: req.user.id
    });

    if (!atual) {
      return res.status(404).json({
        erro: 'Encomenda nao encontrada'
      });
    }

    if (transicoes[atual.estado] !== estado) {
      return res.status(409).json({
        erro: 'Transicao de estado nao permitida'
      });
    }

    // Evita que duas atualizações simultâneas avancem o mesmo estado.
    const encomenda = await Order.findOneAndUpdate(
      {
        _id: id,
        produtor: req.user.id,
        estado: atual.estado
      },
      { $set: { estado } },
      { new: true, runValidators: true }
    );

    if (!encomenda) {
      return res.status(409).json({
        erro: 'A encomenda foi alterada por outra operacao. Atualize e tente novamente'
      });
    }

    // Notifica o comprador, caso o Socket.io esteja disponível.
    const io = req.app.get('io');

    if (io) {
      io.to(`user:${encomenda.comprador}`)
        .emit('encomenda-atualizada', {
          id: encomenda._id,
          estado: encomenda.estado
        });
    }

    res.json(encomenda);
  } catch (err) {
    next(err);
  }
});

module.exports = router;