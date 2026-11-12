// Passo 8: guardar as imagens dos produtos no storage da Cloud (Azure Blob Storage).
// Em AWS: @aws-sdk/client-s3 · Em Google Cloud: @google-cloud/storage

const { BlobServiceClient } = require('@azure/storage-blob');
const { randomUUID } = require('crypto');
const path = require('path');

let container;

function obterContainer() {
  if (!container) {
    if (!process.env.STORAGE_CONN) {
      throw new Error('STORAGE_CONN não está definida');
    }

    container = BlobServiceClient
      .fromConnectionString(process.env.STORAGE_CONN)
      .getContainerClient(process.env.STORAGE_CONTAINER || 'produtos');
  }

  return container;
}

async function guardarImagem(ficheiro) {
  const tiposPermitidos = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };

  if (!ficheiro || !ficheiro.buffer) {
    throw new Error('Nenhuma imagem foi enviada');
  }

  const extensao = tiposPermitidos[ficheiro.mimetype];

  if (!extensao) {
    throw new Error('Formato inválido. Envie uma imagem JPEG, PNG ou WebP');
  }

  const nomeArquivo = `${randomUUID()}${extensao}`;
  const clienteContainer = obterContainer();

  await clienteContainer.createIfNotExists({
    access: 'blob'
  });

  const blob = clienteContainer.getBlockBlobClient(nomeArquivo);

  await blob.uploadData(ficheiro.buffer, {
    blobHTTPHeaders: {
      blobContentType: ficheiro.mimetype
    }
  });

  return blob.url;
}

module.exports = { guardarImagem };