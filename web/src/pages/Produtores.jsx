
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Produtores() {
  const [produtores, setProdutores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/producers')
      .then((resposta) => setProdutores(resposta.produtores || []))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <>
      <section className="destaque mb-4">
        <h1>Conheça nossos produtores</h1>
        <p className="texto-secundario">
          Descubra quem produz os alimentos que chegam à sua mesa.
          Valorize a produção local!
        </p>
      </section>

      {carregando && <p>Carregando produtores...</p>}

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {!carregando && !erro && produtores.length === 0 && (
        <p className="texto-secundario">
          Nenhum produtor disponível no momento.
        </p>
      )}

      <section className="row g-3" aria-label="Lista de produtores">
        {produtores.map((produtor) => (
          <div className="col-12 col-md-6 col-lg-4" key={produtor.id}>
            <article className="card h-100">
              <div className="card-body d-flex flex-column">
                <h2 className="h5">
                  {produtor.nomeExploracao || produtor.nome}
                </h2>

                <p className="texto-secundario mb-2">
                  {produtor.localidade}
                </p>

                {produtor.descricao && (
                  <p>{produtor.descricao}</p>
                )}

                <p className="small mb-1">
                  <strong>Produtos disponíveis:</strong>{' '}
                  {produtor.totalProdutos}
                </p>

                <p className="small mb-3">
                  <strong>Avaliação:</strong>{' '}
                  {produtor.avaliacaoMedia !== null
                    ? `${produtor.avaliacaoMedia} / 5 (${produtor.totalAvaliacoes} avaliações)`
                    : 'Ainda sem avaliações'}
                </p>

                <Link
                  to={`/produtores/${produtor.id}`}
                  className="btn btn-outline-success mt-auto"
                >
                  Conhecer produtor
                </Link>
              </div>
            </article>
          </div>
        ))}
      </section>
    </>
  );
}