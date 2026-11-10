
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Gera um token compatível com o middleware da aplicação.
function emitirToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      papel: user.papel
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

// Nunca devolve o hash da password ao cliente.
function dadosPublicos(user) {
  return {
    id: user._id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
    ...(user.papel === 'produtor' ? { produtor: user.produtor } : {})
  };
}

// POST /api/auth/registo
router.post('/registo', async (req, res, next) => {
  try {
    const { nome, email, password, papel, produtor } = req.body;

    if (!nome?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        erro: 'Nome, email e password são obrigatórios'
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      return res.status(400).json({ erro: 'Email inválido' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        erro: 'A password deve ter pelo menos 8 caracteres'
      });
    }

    // Não permitir que alguém crie uma conta de administrador pelo registo.
    if (!['comprador', 'produtor'].includes(papel)) {
      return res.status(400).json({
        erro: 'O tipo de conta deve ser comprador ou produtor'
      });
    }

    if (
      papel === 'produtor' &&
      (!produtor?.nomeExploracao?.trim() || !produtor?.localidade?.trim())
    ) {
      return res.status(400).json({
        erro: 'Produtores devem informar o nome da exploração e a localidade'
      });
    }

    const existente = await User.findOne({ email: emailNormalizado });

    if (existente) {
      return res.status(409).json({ erro: 'Este email já está registado' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const dadosUtilizador = {
      nome: nome.trim(),
      email: emailNormalizado,
      passwordHash,
      papel
    };

    if (papel === 'produtor') {
      dadosUtilizador.produtor = {
        nomeExploracao: produtor.nomeExploracao.trim(),
        localidade: produtor.localidade.trim(),
        validado: false
      };
    }

    const user = await User.create(dadosUtilizador);

    return res.status(201).json({
      token: emitirToken(user),
      utilizador: dadosPublicos(user)
    });
  } catch (err) {
    // Protege também contra duas tentativas simultâneas com o mesmo email.
    if (err.code === 11000) {
      return res.status(409).json({ erro: 'Este email já está registado' });
    }

    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        erro: 'Email e password são obrigatórios'
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase()
    }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    return res.json({
      token: emitirToken(user),
      utilizador: dadosPublicos(user)
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/eu
router.get('/eu', auth(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    return res.json(dadosPublicos(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
