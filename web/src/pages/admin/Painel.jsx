
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const moeda = (valor) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(valor || 0);

const dataFormatada = (data) =>
  data ? new Date(data).toLocaleString('pt-PT') : 'Data não disponível';

export default function PainelAdmin() {
  const { token } = useAuth();

  const [estatisticas, setEstatisticas] = useState(null);
  const [produtores, setProdutores] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [leiloes, setLeiloes] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const [
        dadosEstatisticas,
        dadosProdutores,
        dadosAvaliacoes,
        dadosLeiloes
      ] = await Promise.all([
        api('/admin/estatisticas', { token }),
        api('/admin/produtores/pendentes', { token }),
        api('/admin/reviews/denunciadas', { token }),
        api('/auctions?estado=ativo')
      ]);

      setEstatisticas(dadosEstatisticas);
      setProdutores(dadosProdutores);
      setAvaliacoes(dadosAvaliacoes);
      setLeiloes(dadosLeiloes);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function alterarValidacao(id, aprovado) {
    setAcao(id);
    setErro('');
    setMensagem('');

    try {
      const resposta = await api(`/admin/produtores/${id}/validacao`, {
        metodo: 'PATCH',
        corpo: { aprovado },
        token
      });

      setMensagem(resposta.mensagem);
      await carregarDados();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAcao('');
    }
  }

  async function alterarVisibilidade(id, visivel) {
    setAcao(id);
    setErro('');
    setMensagem('');

    try {
      const resposta = await api(`/admin/reviews/${id}`, {
        metodo: 'PATCH',
        corpo: { visivel },
        token
      });

      setMensagem(resposta.mensagem);
      await carregarDados();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAcao('');
    }
  }

  if (carregando) {
    return <p>Carregando painel administrativo...</p>;
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h1>Administração</h1>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={carregarDados}
        >
          Atualizar dados
        </button>
      </div>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="alert alert-success" role="status">
          {mensagem}
        </div>
      )}

      {estatisticas && (
        <>
          <h2 className="h4 mb-3">Estatísticas gerais</h2>

          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Usuários</h3>
                  <p className="fs-3 mb-0">{estatisticas.usuarios.total}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Compradores</h3>
                  <p className="fs-3 mb-0">{estatisticas.usuarios.compradores}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Produtores aprovados</h3>
                  <p className="fs-3 mb-0">{estatisticas.usuarios.produtoresAprovados}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Produtores pendentes</h3>
                  <p className="fs-3 mb-0">{estatisticas.usuarios.produtoresPendentes}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Produtos</h3>
                  <p className="fs-3 mb-0">{estatisticas.produtos.total}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Encomendas</h3>
                  <p className="fs-3 mb-0">{estatisticas.encomendas.total}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Leilões</h3>
                  <p className="fs-3 mb-0">{estatisticas.leiloes.total}</p>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-lg-3">
              <div className="card h-100">
                <div className="card-body">
                  <h3 className="h6">Avaliações visíveis</h3>
                  <p className="fs-3 mb-0">{estatisticas.avaliacoes.totalVisiveis}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h3 className="h5">Valor estimado das encomendas</h3>
              <p className="fs-3 mb-0">
                {moeda(estatisticas.encomendas.valorTotalEstimado)}
              </p>
              <small className="text-secondary">
                Soma dos valores das linhas de todas as encomendas.
              </small>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h3 className="h5">Encomendas por estado</h3>
              {Object.entries(estatisticas.encomendas.porEstado).map(
                ([estado, total]) => (
                  <p key={estado} className="mb-1">
                    <strong>{estado}:</strong> {total}
                  </p>
                )
              )}

              <hr />

              <h3 className="h5">Leilões por estado</h3>
              {Object.entries(estatisticas.leiloes.porEstado).map(
                ([estado, total]) => (
                  <p key={estado} className="mb-1">
                    <strong>{estado}:</strong> {total}
                  </p>
                )
              )}
            </div>
          </div>
        </>
      )}

      <section className="mb-5">
        <h2 className="h4 mb-3">Produtores aguardando aprovação</h2>

        {produtores.length === 0 ? (
          <p className="text-secondary">Não existem produtores pendentes.</p>
        ) : (
          <div className="row g-3">
            {produtores.map((produtor) => (
              <div className="col-12 col-md-6" key={produtor._id}>
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="h5">{produtor.nome}</h3>
                    <p className="mb-1">{produtor.email}</p>
                    <p className="mb-3">
                      <strong>Exploração:</strong>{' '}
                      {produtor.produtor?.nomeExploracao || 'Não informada'}
                      <br />
                      <strong>Localidade:</strong>{' '}
                      {produtor.produtor?.localidade || 'Não informada'}
                    </p>

                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={Boolean(acao)}
                        onClick={() => alterarValidacao(produtor._id, true)}
                      >
                        Aprovar
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        disabled={Boolean(acao)}
                        onClick={() => alterarValidacao(produtor._id, false)}
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-5">
        <h2 className="h4 mb-3">Avaliações denunciadas</h2>

        {avaliacoes.length === 0 ? (
          <p className="text-secondary">Não existem avaliações denunciadas.</p>
        ) : (
          <div className="row g-3">
            {avaliacoes.map((avaliacao) => (
              <div className="col-12 col-lg-6" key={avaliacao._id}>
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="h6">
                      {avaliacao.produto?.nome || 'Avaliação de produtor'}
                    </h3>

                    <p className="mb-1">
                      <strong>Autor:</strong>{' '}
                      {avaliacao.autor?.nome || 'Não identificado'}
                    </p>

                    <p className="mb-1">
                      <strong>Produtor:</strong>{' '}
                      {avaliacao.produtor?.nome || 'Não identificado'}
                    </p>

                    <p className="mb-1">
                      <strong>Classificação:</strong> {avaliacao.classificacao}/5
                    </p>

                    <p className="mb-1">
                      <strong>Denúncias:</strong> {avaliacao.denuncias}
                    </p>

                    <p className="my-3">{avaliacao.comentario}</p>

                    <p className="small text-secondary">
                      {dataFormatada(avaliacao.createdAt)}
                    </p>

                    <button
                      type="button"
                      className={`btn ${avaliacao.visivel ? 'btn-outline-danger' : 'btn-success'}`}
                      disabled={Boolean(acao)}
                      onClick={() =>
                        alterarVisibilidade(avaliacao._id, !avaliacao.visivel)
                      }
                    >
                      {avaliacao.visivel ? 'Ocultar avaliação' : 'Reativar avaliação'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-4">
        <h2 className="h4 mb-3">Leilões ativos</h2>

        {leiloes.length === 0 ? (
          <p className="text-secondary">Não existem leilões ativos neste momento.</p>
        ) : (
          <div className="row g-3">
            {leiloes.map((leilao) => (
              <div className="col-12 col-md-6" key={leilao._id}>
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="h5">{leilao.lote}</h3>
                    <p className="mb-1">
                      <strong>Produtor:</strong>{' '}
                      {leilao.produtor?.produtor?.nomeExploracao ||
                        leilao.produtor?.nome ||
                        'Não identificado'}
                    </p>
                    <p className="mb-1">
                      <strong>Lance atual:</strong>{' '}
                      {moeda(leilao.licitacaoAtual?.valor)}
                    </p>
                    <p className="mb-1">
                      <strong>Início:</strong> {dataFormatada(leilao.iniciaEm)}
                    </p>
                    <p className="mb-0">
                      <strong>Término:</strong> {dataFormatada(leilao.terminaEm)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}