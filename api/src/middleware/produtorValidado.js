const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        erro: 'Utilizador nao encontrado'
      });
    }

    if (user.papel !== 'produtor' || user.produtor?.validado !== true) {
      return res.status(403).json({
        erro: 'A sua conta de produtor ainda nao foi validada pelo administrador'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
