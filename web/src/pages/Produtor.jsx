
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CartaoProduto from '../components/CartaoProduto.jsx';
import { useCarrinho } from '../context/CarrinhoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Produtor() {
  const { id } = useParams();

  const [dados, setDados] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');

  const carrinho = useCarrinho();
  const { utilizador } = useAuth();

  useEffect(() => {
    let ativo = true;

    setCarregando(true);
    setErro('');
    setErroAvaliacoes('');
    setAvaliacoes([]);

    api(`/producers/${id}`)
      .then((resposta) => {
        if (ativo) setDados(resposta);
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    api(`/reviews?produtor=${id}`)
      .then((resposta) => {
        if (ativo) setAvaliacoes(resposta);
      })
      .catch((e) => {
        if (ativo) setErroAvaliacoes(e.message);
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  if (carregando) {
    return <p className="texto-secundario">Carregando página do produtor...</p>;
  }

  if (erro) {
    return <div className="alert alert-danger">{erro}</div>;
  }

  if (!dados) {
    return <div className="alert alert-warning">Produtor não encontrado.</div>;
  }

  const {
    produtor,
    produtos,
    avaliacaoMedia,
    totalAvaliacoes
  } = dados;

  const podeComprar = utilizador?.papel === 'comprador';

  return (
    <>
      <section className="destaque mb-4">
        <p className="texto-secundario mb-1">Conheça quem produz</p>

        <h1>{produtor.nomeExploracao}</h1>

        <h2 className="h5">{produtor.nome}</h2>

        <p className="texto-secundario">{produtor.localidade}</p>

        {produtor.descricao && <p>{produtor.descricao}</p>}
      </section>

      <section className="mb-4">
        <h2 className="h4">Sobre esta exploração</h2>

        <p>
          {produtor.descricao ||
            'Este produtor ainda não adicionou uma descrição da sua exploração.'}
        </p>

        <p>
          <strong>Localidade:</strong> {produtor.localidade}
        </p>

        {produtor.localizacao?.lat != null &&
          produtor.localizacao?.lng != null && (
            <p>
              <a
                href={`https://www.google.com/maps?q=${produtor.localizacao.lat},${produtor.localizacao.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver localização no mapa
              </a>
            </p>
          )}
      </section>

      <section className="mb-4">
        <h2 className="h4">Avaliações</h2>

        {avaliacaoMedia != null ? (
          <p>
            <strong>{avaliacaoMedia}/5</strong>
            {' '}— {totalAvaliacoes}{' '}
            {totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
          </p>
        ) : (
          <p className="texto-secundario">
            Este produtor ainda não possui avaliações.
          </p>
        )}

        {erroAvaliacoes ? (
          <p className="texto-secundario">
            Não foi possível carregar os comentários.
          </p>
        ) : avaliacoes.length > 0 ? (
          <div className="d-flex flex-column gap-3">
            {avaliacoes.map((avaliacao) => (
              <article
                key={avaliacao._id}
                className="card p-3"
              >
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <strong>
                    {avaliacao.autor?.nome || 'Comprador'}
                  </strong>

                  <span>
                    {'★'.repeat(avaliacao.classificacao)}
                    {'☆'.repeat(5 - avaliacao.classificacao)}
                    {' '}({avaliacao.classificacao}/5)
                  </span>
                </div>

                {avaliacao.comentario && (
                  <p className="mb-0 mt-2">{avaliacao.comentario}</p>
                )}

                <small className="texto-secundario mt-2">
                  {new Date(avaliacao.createdAt).toLocaleDateString('pt-BR')}
                </small>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="h4 mb-3">Produtos disponíveis</h2>

        {produtos.length > 0 ? (
          <div className="grelha-produtos">
            {produtos.map((produto) => (
              <CartaoProduto
                key={produto._id}
                produto={produto}
                onAdicionar={
                  podeComprar
                    ? () => carrinho.adicionar(produto)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className="texto-secundario">
            Este produtor ainda não possui produtos disponíveis.
          </p>
        )}
      </section>
    </>
  );
}