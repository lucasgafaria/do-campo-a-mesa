
const { Schema, model, Types } = require('mongoose');

const reviewSchema = new Schema({
  autor: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  produtor: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  produto: {
    type: Types.ObjectId,
    ref: 'Product'
  },
  encomenda: {
    type: Types.ObjectId,
    ref: 'Order',
    required: true
  },
  classificacao: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comentario: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  denuncias: {
    type: Number,
    default: 0
  },
  denunciantes: [{
    type: Types.ObjectId,
    ref: 'User'
  }],
  visivel: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Uma única avaliação por encomenda.
reviewSchema.index({ encomenda: 1 }, { unique: true });

// Facilita a consulta das avaliações visíveis de cada produtor.
reviewSchema.index({ produtor: 1, visivel: 1, createdAt: -1 });

module.exports = model('Review', reviewSchema);