
import { useState } from 'react';
import { useCarrinho } from '../context/CarrinhoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Carrinho() {
  const {
    linhas,
    alterarQuantidade,
    remover
  } = useCarrinho();

  const { token } = useAuth();

  const [tipoEntrega, setTipoEntrega] = useState('levantamento');
  const [morada, setMorada] = useState('');
  const [processando, setProcessando] = useState(null);
  const [mensagens, setMensagens] = useState({});
  const [aviso, setAviso] = useState('');

  // Agrupa os produtos pelo respetivo produtor.
  const grupos = Object.values(
    linhas.reduce((gruposAtuais, linha) => {
      const produtor = linha.produto.produtor;
      const produtorId = produtor?._id || produtor;

      if (!gruposAtuais[produtorId]) {
        gruposAtuais[produtorId] = {
          produtorId,
          nome: produtor?.produtor?.nomeExploracao
            || produtor?.nomeExploracao
            || produtor?.nome
            || 'Produtor',
          linhas: []
        };
      }

      gruposAtuais[produtorId].linhas.push(linha);

      return gruposAtuais;
    }, {})
  );

  async function finalizarEncomenda(grupo) {
    if (tipoEntrega === 'entrega' && !morada.trim()) {
      setMensagens((atual) => ({
        ...atual,
        [grupo.produtorId]: 'Indique a morada de entrega.'
      }));
      return;
    }

    setProcessando(grupo.produtorId);
    setAviso('');

    setMensagens((atual) => ({
      ...atual,
      [grupo.produtorId]: ''
    }));

    try {
      await api('/orders', {
        metodo: 'POST',
        token,
        corpo: {
          linhas: grupo.linhas.map(({ produto, quantidade }) => ({
            produto: produto._id,
            quantidade
          })),
          entrega: {
            tipo: tipoEntrega,
            ...(tipoEntrega === 'entrega'
              ? { morada: morada.trim() }
              : {})
          }
        }
      });

      grupo.linhas.forEach(({ produto }) => {
        remover(produto._id);
      });

      setAviso(`Encomenda enviada com sucesso para ${grupo.nome}.`);
    } catch (erro) {
      setMensagens((atual) => ({
        ...atual,
        [grupo.produtorId]: erro.message
      }));
    } finally {
      setProcessando(null);
    }
  }

  return (
    <>
      <h1>Carrinho</h1>

      {aviso && (
        <div className="alert alert-success">
          {aviso}
        </div>
      )}

      {linhas.length === 0 ? (
        <p>O carrinho está vazio.</p>
      ) : (
        <>
          {grupos.map((grupo) => {
            const subtotal = grupo.linhas.reduce(
              (soma, linha) =>
                soma + linha.produto.preco * linha.quantidade,
              0
            );

            return (
              <section key={grupo.produtorId} className="mb-4">
                <h2 className="h5">{grupo.nome}</h2>

                <ul className="list-group mb-2">
                  {grupo.linhas.map(({ produto, quantidade }) => (
                    <li
                      key={produto._id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{produto.nome}</strong>
                        <div>
                          {produto.preco.toFixed(2)} € × {quantidade}
                        </div>
                        <div className="fw-bold">
                          {(produto.preco * quantidade).toFixed(2)} €
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          style={{ width: '80px' }}
                          value={quantidade}
                          onChange={(e) =>
                            alterarQuantidade(produto._id, e.target.value)
                          }
                        />

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => remover(produto._id)}
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="fw-bold">
                  Subtotal: {subtotal.toFixed(2)} €
                </p>

                {mensagens[grupo.produtorId] && (
                  <div className="alert alert-danger">
                    {mensagens[grupo.produtorId]}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={processando !== null}
                  onClick={() => finalizarEncomenda(grupo)}
                >
                  {processando === grupo.produtorId
                    ? 'A enviar...'
                    : 'Finalizar encomenda'}
                </button>
              </section>
            );
          })}

          <hr />

          <h2 className="h5">Tipo de entrega</h2>

          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              id="levantamento"
              name="tipoEntrega"
              value="levantamento"
              checked={tipoEntrega === 'levantamento'}
              onChange={(e) => setTipoEntrega(e.target.value)}
            />
            <label className="form-check-label" htmlFor="levantamento">
              Levantamento
            </label>
          </div>

          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="radio"
              id="entrega"
              name="tipoEntrega"
              value="entrega"
              checked={tipoEntrega === 'entrega'}
              onChange={(e) => setTipoEntrega(e.target.value)}
            />
            <label className="form-check-label" htmlFor="entrega">
              Entrega
            </label>
          </div>

          {tipoEntrega === 'entrega' && (
            <div className="mb-3">
              <label htmlFor="morada" className="form-label">
                Morada de entrega
              </label>
              <input
                id="morada"
                type="text"
                className="form-control"
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
                placeholder="Indique a morada completa"
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
