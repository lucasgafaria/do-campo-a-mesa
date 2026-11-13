
const router = require('express').Router();
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const Review = require('../models/Review');
const Order = require('../models/Order');

// POST /api/reviews
// Comprador avalia uma encomenda que já foi entregue.
router.post('/', auth('comprador'), async (req, res, next) => {
  try {
    const { encomenda, classificacao, comentario } = req.body;

    if (!mongoose.isValidObjectId(encomenda)) {
      return res.status(400).json({ erro: 'ID da encomenda inválido.' });
    }

    if (!Number.isInteger(classificacao) || classificacao < 1 || classificacao > 5) {
      return res.status(400).json({ erro: 'A classificação deve ser um número inteiro entre 1 e 5.' });
    }

    if (comentario !== undefined && (typeof comentario !== 'string' || comentario.length > 1000)) {
      return res.status(400).json({ erro: 'O comentário deve ser um texto de até 1000 caracteres.' });
    }

    const pedido = await Order.findOne({
      _id: encomenda,
      comprador: req.user.id
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Encomenda não encontrada.' });
    }

    if (pedido.estado !== 'entregue') {
      return res.status(409).json({ erro: 'Só é possível avaliar encomendas entregues.' });
    }

    const existente = await Review.findOne({ encomenda: pedido._id });

    if (existente) {
      return res.status(409).json({ erro: 'Esta encomenda já foi avaliada.' });
    }

    const avaliacao = await Review.create({
      autor: req.user.id,
      produtor: pedido.produtor,
      encomenda: pedido._id,
      classificacao,
      comentario
    });

    return res.status(201).json(avaliacao);
  } catch (erro) {
    if (erro.code === 11000) {
      return res.status(409).json({ erro: 'Esta encomenda já foi avaliada.' });
    }
    next(erro);
  }
});

// GET /api/reviews?produtor=ID
// GET /api/reviews?produto=ID
router.get('/', async (req, res, next) => {
  try {
    const { produtor, produto } = req.query;

    if (!produtor && !produto) {
      return res.status(400).json({ erro: 'Informe o produtor ou o produto para consultar avaliações.' });
    }

    if (produtor && !mongoose.isValidObjectId(produtor)) {
      return res.status(400).json({ erro: 'ID do produtor inválido.' });
    }

    if (produto && !mongoose.isValidObjectId(produto)) {
      return res.status(400).json({ erro: 'ID do produto inválido.' });
    }

    const filtro = { visivel: true };

    if (produtor) filtro.produtor = produtor;
    if (produto) filtro.produto = produto;

    const avaliacoes = await Review.find(filtro)
      .populate('autor', 'nome')
      .populate('produto', 'nome')
      .sort({ createdAt: -1 });

    return res.json(avaliacoes);
  } catch (erro) {
    next(erro);
  }
});


// POST /api/reviews/:id/denuncia
router.post('/:id/denuncia', auth(), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        erro: 'ID da avaliação inválido.'
      });
    }

    const avaliacao = await Review.findOne({
      _id: id,
      visivel: true
    });

    if (!avaliacao) {
      return res.status(404).json({
        erro: 'Avaliação não encontrada.'
      });
    }

    if (avaliacao.autor.toString() === req.user.id) {
      return res.status(403).json({
        erro: 'Você não pode denunciar sua própria avaliação.'
      });
    }

    const atualizada = await Review.findOneAndUpdate(
      {
        _id: id,
        visivel: true,
        denunciantes: { $ne: req.user.id }
      },
      {
        $addToSet: { denunciantes: req.user.id },
        $inc: { denuncias: 1 }
      },
      { new: true }
    );

    if (!atualizada) {
      const jaDenunciou = await Review.exists({
        _id: id,
        visivel: true,
        denunciantes: req.user.id
      });

      if (jaDenunciou) {
        return res.status(409).json({
          erro: 'Você já denunciou esta avaliação.'
        });
      }

      return res.status(404).json({
        erro: 'Avaliação não encontrada.'
      });
    }

    return res.json({
      mensagem: 'Denúncia registrada com sucesso.',
      denuncias: atualizada.denuncias
    });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;