
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const filtros = [
  { valor: 'ativo', texto: 'Ativos' },
  { valor: 'agendado', texto: 'Agendados' },
  { valor: 'terminado', texto: 'Terminados' }
];

function formatarData(data) {
  return new Date(data).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

export default function Leiloes() {
  const [estado, setEstado] = useState('ativo');
  const [leiloes, setLeiloes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarLeiloes() {
      setCarregando(true);
      setErro('');

      try {
        const dados = await api(`/auctions?estado=${estado}`);

        if (ativo) {
          setLeiloes(dados);
        }
      } catch (e) {
        if (ativo) {
          setErro(e.message);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarLeiloes();

    return () => {
      ativo = false;
    };
  }, [estado]);

  return (
    <main className="container py-4">
      <h1 className="mb-3">Leilões</h1>

      <p className="text-muted">
        Acompanhe os lotes disponíveis e participe das licitações.
      </p>

      <div className="d-flex flex-wrap gap-2 mb-4">
        {filtros.map((filtro) => (
          <button
            key={filtro.valor}
            type="button"
            className={`btn ${
              estado === filtro.valor
                ? 'btn-success'
                : 'btn-outline-success'
            }`}
            onClick={() => setEstado(filtro.valor)}
          >
            {filtro.texto}
          </button>
        ))}
      </div>

      {carregando && <p>Carregando leilões...</p>}

      {erro && (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar os leilões: {erro}
        </div>
      )}

      {!carregando && !erro && leiloes.length === 0 && (
        <div className="alert alert-info">
          Não existem leilões nesta categoria no momento.
        </div>
      )}

      <div className="row g-3">
        {leiloes.map((leilao) => (
          <div className="col-12 col-md-6 col-lg-4" key={leilao._id}>
            <article className="card h-100 shadow-sm">
              {leilao.produto?.imagemUrl && (
                <img
                  src={leilao.produto.imagemUrl}
                  className="card-img-top"
                  alt={leilao.lote}
                  style={{ height: '190px', objectFit: 'cover' }}
                />
              )}

              <div className="card-body d-flex flex-column">
                <span className={`badge align-self-start mb-2 ${
                  leilao.estado === 'ativo'
                    ? 'bg-success'
                    : leilao.estado === 'agendado'
                      ? 'bg-warning text-dark'
                      : 'bg-secondary'
                }`}>
                  {leilao.estado === 'ativo'
                    ? 'Em andamento'
                    : leilao.estado === 'agendado'
                      ? 'Agendado'
                      : 'Terminado'}
                </span>

                <h2 className="h5">{leilao.lote}</h2>

                <p className="text-muted mb-2">
                  Produtor:{' '}
                  {leilao.produtor?.produtor?.nomeExploracao ||
                    leilao.produtor?.nome ||
                    'Não informado'}
                </p>

                <p className="mb-1">
                  <strong>Quantidade:</strong> {leilao.quantidade}
                </p>

                <p className="mb-1">
                  <strong>Licitação atual:</strong>{' '}
                  {Number(leilao.licitacaoAtual?.valor ?? leilao.precoBase).toFixed(2)} €
                </p>

                <p className="mb-1">
                  <strong>Incremento mínimo:</strong>{' '}
                  {Number(leilao.incremento).toFixed(2)} €
                </p>

                <p className="small text-muted mt-2">
                  Início: {formatarData(leilao.iniciaEm)}
                  <br />
                  Término: {formatarData(leilao.terminaEm)}
                </p>

                <div className="mt-auto pt-2">
                  <Link
                    to={`/leiloes/${leilao._id}`}
                    className="btn btn-success w-100"
                  >
                    {leilao.estado === 'ativo'
                      ? 'Entrar no leilão'
                      : 'Ver leilão'}
                  </Link>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>
    </main>
  );
}
