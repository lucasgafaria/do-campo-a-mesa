
const router = require('express').Router();
const mongoose = require('mongoose');
const multer = require('multer');

const Product = require('../models/Product');
const auth = require('../middleware/auth');
const produtorValidado = require('../middleware/produtorValidado');
const porFazer = require('./_naoImplementado');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const CATEGORIAS = Product.schema.path('categoria').enumValues;
const EPOCAS = Product.schema.path('epocas').caster.enumValues;

// Valida e seleciona apenas os campos permitidos.
function validarDados(body, parcial = false) {
  const dados = {};
  const erros = [];

  if (!parcial || Object.hasOwn(body, 'nome')) {
    if (typeof body.nome !== 'string' || !body.nome.trim()) {
      erros.push('Nome obrigatorio');
    } else if (body.nome.trim().length > 100) {
      erros.push('Nome deve ter no maximo 100 caracteres');
    } else {
      dados.nome = body.nome.trim();
    }
  }

  if (!parcial || Object.hasOwn(body, 'categoria')) {
    if (!CATEGORIAS.includes(body.categoria)) {
      erros.push('Categoria invalida');
    } else {
      dados.categoria = body.categoria;
    }
  }

  if (!parcial || Object.hasOwn(body, 'preco')) {
    const preco = Number(body.preco);

    if (body.preco === '' || !Number.isFinite(preco) || preco < 0) {
      erros.push('Preco deve ser um numero maior ou igual a zero');
    } else {
      dados.preco = preco;
    }
  }

  if (Object.hasOwn(body, 'unidade')) {
    if (typeof body.unidade !== 'string' || !body.unidade.trim()) {
      erros.push('Unidade invalida');
    } else {
      dados.unidade = body.unidade.trim();
    }
  }

  if (Object.hasOwn(body, 'stock')) {
    const stock = Number(body.stock);

    if (body.stock === '' || !Number.isFinite(stock) || stock < 0) {
      erros.push('Stock deve ser um numero maior ou igual a zero');
    } else {
      dados.stock = stock;
    }
  }

  if (Object.hasOwn(body, 'biologico')) {
    if (typeof body.biologico !== 'boolean') {
      erros.push('Biologico deve ser true ou false');
    } else {
      dados.biologico = body.biologico;
    }
  }

  if (Object.hasOwn(body, 'epocas')) {
    if (
      !Array.isArray(body.epocas) ||
      body.epocas.some(epoca => !EPOCAS.includes(epoca))
    ) {
      erros.push('Lista de epocas invalida');
    } else {
      dados.epocas = body.epocas;
    }
  }

  return { dados, erros };
}

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { q, categoria, precoMax, bio } = req.query;
    const filtro = {};

    if (q) {
      const termo = String(q).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtro.nome = { $regex: termo, $options: 'i' };
    }

    if (categoria && categoria !== 'Todos') {
      filtro.categoria = categoria;
    }

    if (precoMax !== undefined) {
      const valor = Number(precoMax);

      if (!Number.isFinite(valor) || valor < 0) {
        return res.status(400).json({ erro: 'Preco maximo invalido' });
      }

      filtro.preco = { $lte: valor };
    }

    if (bio === 'true') filtro.biologico = true;
    if (bio === 'false') filtro.biologico = false;

    if (req.query.epoca) filtro.epocas = req.query.epoca;

    const lista = await Product.find(filtro)
      .populate('produtor', 'nome produtor.localidade')
      .sort({ createdAt: -1 });

    res.json(lista);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de produto invalido' });
    }

    const produto = await Product.findById(id)
      .populate('produtor', 'nome produtor.localidade');

    if (!produto) {
      return res.status(404).json({ erro: 'Produto nao encontrado' });
    }

    res.json(produto);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', auth('produtor'), produtorValidado, async (req, res, next) => {
  try {
    const { dados, erros } = validarDados(req.body);

    if (erros.length) {
      return res.status(400).json({ erros });
    }

    const produto = await Product.create({
      ...dados,
      produtor: req.user.id
    });

    res
      .status(201)
      .location(`/api/products/${produto._id}`)
      .json(produto);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', auth('produtor'), produtorValidado, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de produto invalido' });
    }

    const { dados, erros } = validarDados(req.body, true);

    if (erros.length) {
      return res.status(400).json({ erros });
    }

    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo valido informado' });
    }

    const produto = await Product.findOneAndUpdate(
      { _id: id, produtor: req.user.id },
      { $set: dados },
      { new: true, runValidators: true }
    );

    if (!produto) {
      return res.status(404).json({
        erro: 'Produto nao encontrado ou nao pertence ao produtor'
      });
    }

    res.json(produto);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth('produtor'), produtorValidado, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID de produto invalido' });
    }

    const produto = await Product.findOneAndDelete({
      _id: id,
      produtor: req.user.id
    });

    if (!produto) {
      return res.status(404).json({
        erro: 'Produto nao encontrado ou nao pertence ao produtor'
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Upload de imagem: sera implementado na etapa de Cloud Storage.
router.post(
  '/:id/imagem',
  auth('produtor'),
  produtorValidado,
  upload.single('imagem'),
  porFazer('Upload da imagem do produto')
);

module.exports = router;