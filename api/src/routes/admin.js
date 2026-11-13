
const router = require('express').Router();
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Auction = require('../models/Auction');
const Review = require('../models/Review');

router.use(auth('admin'));

// Lista os produtores que aguardam aprovação.
router.get('/produtores/pendentes', async (req, res, next) => {
  try {
    const produtores = await User.find({
      papel: 'produtor',
      'produtor.validado': false
    }).select('nome email produtor createdAt');

    res.json(produtores);
  } catch (err) {
    next(err);
  }
});

// Aprova ou rejeita um produtor.
router.patch('/produtores/:id/validacao', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { aprovado } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de produtor inválido' });
    }

    if (typeof aprovado !== 'boolean') {
      return res.status(400).json({
        erro: 'O campo aprovado deve ser true ou false'
      });
    }

    const produtor = await User.findOne({
      _id: id,
      papel: 'produtor'
    });

    if (!produtor) {
      return res.status(404).json({ erro: 'Produtor não encontrado' });
    }

    produtor.produtor = produtor.produtor || {};
    produtor.produtor.validado = aprovado;

    await produtor.save();

    res.json({
      mensagem: aprovado
        ? 'Produtor aprovado com sucesso'
        : 'Produtor rejeitado com sucesso',
      produtor: {
        id: produtor._id,
        nome: produtor.nome,
        email: produtor.email,
        produtor: produtor.produtor
      }
    });
  } catch (err) {
    next(err);
  }
});

// Retorna estatísticas gerais da plataforma.
router.get('/estatisticas', async (req, res, next) => {
  try {
    const [
      totalUsuarios,
      totalCompradores,
      totalProdutores,
      produtoresPendentes,
      totalProdutos,
      totalEncomendas,
      encomendasPorEstado,
      totalLeiloes,
      leiloesPorEstado,
      totalAvaliacoes,
      valorEncomendas
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ papel: 'comprador' }),
      User.countDocuments({
        papel: 'produtor',
        'produtor.validado': true
      }),
      User.countDocuments({
        papel: 'produtor',
        'produtor.validado': false
      }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        {
          $group: {
            _id: '$estado',
            total: { $sum: 1 }
          }
        }
      ]),
      Auction.countDocuments(),
      Auction.aggregate([
        {
          $group: {
            _id: '$estado',
            total: { $sum: 1 }
          }
        }
      ]),
      Review.countDocuments({ visivel: true }),
      Order.aggregate([
        {
          $unwind: '$linhas'
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  '$linhas.precoUnit',
                  '$linhas.quantidade'
                ]
              }
            }
          }
        }
      ])
    ]);

    const formatarEstados = (resultados) => {
      const estados = {};

      for (const resultado of resultados) {
        estados[resultado._id] = resultado.total;
      }

      return estados;
    };

    res.json({
      usuarios: {
        total: totalUsuarios,
        compradores: totalCompradores,
        produtoresAprovados: totalProdutores,
        produtoresPendentes
      },
      produtos: {
        total: totalProdutos
      },
      encomendas: {
        total: totalEncomendas,
        porEstado: formatarEstados(encomendasPorEstado),
        valorTotalEstimado: Number(
          (valorEncomendas[0]?.total || 0).toFixed(2)
        )
      },
      leiloes: {
        total: totalLeiloes,
        porEstado: formatarEstados(leiloesPorEstado)
      },
      avaliacoes: {
        totalVisiveis: totalAvaliacoes
      }
    });
  } catch (err) {
    next(err);
  }
});

// Lista avaliações denunciadas.
router.get('/reviews/denunciadas', async (req, res, next) => {
  try {
    const avaliacoes = await Review.find({
      denuncias: { $gt: 0 }
    })
      .populate('autor', 'nome')
      .populate('produtor', 'nome')
      .populate('produto', 'nome')
      .sort({ denuncias: -1, createdAt: -1 });

    res.json(avaliacoes);
  } catch (err) {
    next(err);
  }
});

// Oculta ou reativa uma avaliação.
router.patch('/reviews/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { visivel } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        erro: 'ID de avaliação inválido'
      });
    }

    if (typeof visivel !== 'boolean') {
      return res.status(400).json({
        erro: 'O campo visivel deve ser true ou false'
      });
    }

    const avaliacao = await Review.findByIdAndUpdate(
      id,
      { $set: { visivel } },
      { new: true, runValidators: true }
    );

    if (!avaliacao) {
      return res.status(404).json({
        erro: 'Avaliação não encontrada'
      });
    }

    res.json({
      mensagem: visivel
        ? 'Avaliação reativada com sucesso'
        : 'Avaliação ocultada com sucesso',
      avaliacao
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;