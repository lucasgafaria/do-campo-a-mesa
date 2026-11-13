
const router = require('express').Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');
const porFazer = require('./_naoImplementado');


// GET /api/producers
// Lista produtores aprovados com dados públicos e indicadores.
router.get('/', async (req, res, next) => {
  try {
    const [produtores, produtosPorProdutor, avaliacoesPorProdutor] =
      await Promise.all([
        User.find({
          papel: 'produtor',
          'produtor.validado': true
        })
          .select(
            'nome produtor.nomeExploracao produtor.descricao produtor.localidade produtor.localizacao'
          )
          .sort({ 'produtor.nomeExploracao': 1 })
          .lean(),

        Product.aggregate([
          { $match: { stock: { $gt: 0 } } },
          {
            $group: {
              _id: '$produtor',
              total: { $sum: 1 }
            }
          }
        ]),

        Review.aggregate([
          { $match: { visivel: true } },
          {
            $group: {
              _id: '$produtor',
              media: { $avg: '$classificacao' },
              total: { $sum: 1 }
            }
          }
        ])
      ]);

    const mapaProdutos = new Map(
      produtosPorProdutor.map(item => [
        item._id.toString(),
        item.total
      ])
    );

    const mapaAvaliacoes = new Map(
      avaliacoesPorProdutor.map(item => [
        item._id.toString(),
        {
          media: Number(item.media.toFixed(1)),
          total: item.total
        }
      ])
    );

    const resultado = produtores.map(produtor => {
      const id = produtor._id.toString();
      const avaliacao = mapaAvaliacoes.get(id);

      return {
        id: produtor._id,
        nome: produtor.nome,
        nomeExploracao: produtor.produtor.nomeExploracao,
        descricao: produtor.produtor.descricao,
        localidade: produtor.produtor.localidade,
        localizacao: produtor.produtor.localizacao,
        totalProdutos: mapaProdutos.get(id) || 0,
        avaliacaoMedia: avaliacao?.media ?? null,
        totalAvaliacoes: avaliacao?.total || 0
      };
    });

    return res.json({ produtores: resultado });
  } catch (err) {
    next(err);
  }
});

// GET /api/producers/:id
// Retorna os dados públicos de um produtor, produtos e avaliações.
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        erro: 'ID de produtor inválido'
      });
    }

    const produtor = await User.findOne({
      _id: id,
      papel: 'produtor',
      'produtor.validado': true
    }).select(
      'nome produtor.nomeExploracao produtor.descricao produtor.localidade produtor.localizacao'
    );

    if (!produtor) {
      return res.status(404).json({
        erro: 'Produtor não encontrado'
      });
    }

    const produtos = await Product.find({
      produtor: produtor._id,
      stock: { $gt: 0 }
    })
      .select('nome categoria preco unidade stock biologico epocas imagemUrl createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Calcula a média e a quantidade de avaliações visíveis.
    const resultadoAvaliacoes = await Review.aggregate([
      {
        $match: {
          produtor: produtor._id,
          visivel: true
        }
      },
      {
        $group: {
          _id: null,
          media: { $avg: '$classificacao' },
          total: { $sum: 1 }
        }
      }
    ]);

    const avaliacaoMedia = resultadoAvaliacoes.length > 0
      ? Number(resultadoAvaliacoes[0].media.toFixed(1))
      : null;

    const totalAvaliacoes = resultadoAvaliacoes.length > 0
      ? resultadoAvaliacoes[0].total
      : 0;

    res.json({
      produtor: {
        id: produtor._id,
        nome: produtor.nome,
        nomeExploracao: produtor.produtor.nomeExploracao,
        descricao: produtor.produtor.descricao,
        localidade: produtor.produtor.localidade,
        localizacao: produtor.produtor.localizacao
      },
      produtos,
      avaliacaoMedia,
      totalAvaliacoes
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;