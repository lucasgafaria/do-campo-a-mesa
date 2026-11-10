
const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const porFazer = require('./_naoImplementado');

router.use(auth('admin'));

// Lista os produtores que aguardam aprovação
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

// Aprova ou rejeita um produtor
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

// Funcionalidades administrativas ainda não implementadas
router.get('/estatisticas', porFazer('Estatísticas globais'));
router.get('/reviews/denunciadas', porFazer('Avaliações denunciadas'));
router.patch('/reviews/:id', porFazer('Moderar avaliação'));

module.exports = router;
