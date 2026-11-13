
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotificacoes } from '../hooks/useNotificacoes.js';
import EstadoEncomenda from '../components/EstadoEncomenda.jsx';

const PROXIMO_ESTADO = {
  pendente: 'confirmada',
  confirmada: 'pronta',
  pronta: 'entregue'
};

export default function Encomendas() {
  const { token, utilizador } = useAuth();
  const { notificacoes, limparNotificacoes } = useNotificacoes();

  const [encomendas, setEncomendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState('');

  const [formularios, setFormularios] = useState({});
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState('');
  const [avaliacoesEnviadas, setAvaliacoesEnviadas] = useState({});
  const [mensagensAvaliacao, setMensagensAvaliacao] = useState({});

  const carregarEncomendas = useCallback(async () => {
    try {
      setErro('');
      const dados = await api('/orders', { token });
      setEncomendas(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarEncomendas();
  }, [carregarEncomendas]);

  async function alterarEstado(encomenda) {
    const estado = PROXIMO_ESTADO[encomenda.estado];
    if (!estado) return;

    try {
      setAtualizando(encomenda._id);
      setErro('');

      await api(`/orders/${encomenda._id}/estado`, {
        metodo: 'PATCH',
        corpo: { estado },
        token
      });

      await carregarEncomendas();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAtualizando('');
    }
  }

  function alterarFormulario(encomendaId, campo, valor) {
    setFormularios((anterior) => ({
      ...anterior,
      [encomendaId]: {
        classificacao: 5,
        comentario: '',
        ...anterior[encomendaId],
        [campo]: valor
      }
    }));
  }

  async function enviarAvaliacao(evento, encomenda) {
    evento.preventDefault();

    const formulario = formularios[encomenda._id] || {
      classificacao: 5,
      comentario: ''
    };

    try {
      setEnviandoAvaliacao(encomenda._id);
      setMensagensAvaliacao((anterior) => ({
        ...anterior,
        [encomenda._id]: null
      }));

      await api('/reviews', {
        metodo: 'POST',
        corpo: {
          encomenda: encomenda._id,
          classificacao: Number(formulario.classificacao),
          comentario: formulario.comentario
        },
        token
      });

      setAvaliacoesEnviadas((anterior) => ({
        ...anterior,
        [encomenda._id]: true
      }));

      setMensagensAvaliacao((anterior) => ({
        ...anterior,
        [encomenda._id]: {
          tipo: 'success',
          texto: 'Sua avaliação foi enviada com sucesso!'
        }
      }));
    } catch (e) {
      const jaAvaliada = e.message.toLowerCase().includes('já foi avaliada');

      if (jaAvaliada) {
        setAvaliacoesEnviadas((anterior) => ({
          ...anterior,
          [encomenda._id]: true
        }));
      }

      setMensagensAvaliacao((anterior) => ({
        ...anterior,
        [encomenda._id]: {
          tipo: jaAvaliada ? 'info' : 'danger',
          texto: e.message
        }
      }));
    } finally {
      setEnviandoAvaliacao('');
    }
  }

  if (carregando) {
    return <p>Carregando encomendas...</p>;
  }

  return (
    <>
      <h1>Encomendas</h1>

      {notificacoes.length > 0 && utilizador.papel === 'comprador' && (
        <div className="alert alert-info">
          <div className="d-flex justify-content-between align-items-center">
            <strong>Atualizações das encomendas</strong>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={limparNotificacoes}
            >
              Limpar
            </button>
          </div>

          <ul className="mb-0 mt-2">
            {notificacoes.map((n) => (
              <li key={n.id}>{n.mensagem}</li>
            ))}
          </ul>
        </div>
      )}

      {erro && <div className="alert alert-danger">{erro}</div>}

      {encomendas.length === 0 ? (
        <p>
          {utilizador.papel === 'produtor'
            ? 'Ainda não recebeu encomendas.'
            : 'Você ainda não realizou nenhuma encomenda.'}
        </p>
      ) : (
        encomendas.map((encomenda) => {
          const formulario = formularios[encomenda._id] || {
            classificacao: 5,
            comentario: ''
          };

          const mensagem = mensagensAvaliacao[encomenda._id];

          return (
            <div className="card p-3 mb-3" key={encomenda._id}>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <strong>
                  Encomenda #{encomenda._id.slice(-6).toUpperCase()}
                </strong>
                <span className="text-muted">
                  {new Date(encomenda.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>

              <p className="mb-2 mt-2">
                {utilizador.papel === 'comprador'
                  ? `Produtor: ${encomenda.produtor?.produtor?.nomeExploracao || encomenda.produtor?.nome || 'Não informado'}`
                  : `Comprador: ${encomenda.comprador?.nome || 'Não informado'}`}
              </p>

              <EstadoEncomenda estado={encomenda.estado} />

              <ul className="mt-3">
                {encomenda.linhas.map((linha, indice) => (
                  <li key={`${linha.produto?._id || linha.nome}-${indice}`}>
                    {linha.nome} — {linha.quantidade} × €{linha.precoUnit.toFixed(2)}
                  </li>
                ))}
              </ul>

              <p>
                <strong>
                  Total: €{encomenda.linhas.reduce(
                    (total, linha) => total + linha.precoUnit * linha.quantidade,
                    0
                  ).toFixed(2)}
                </strong>
              </p>

              <p className="mb-2">
                Entrega: {encomenda.entrega.tipo === 'entrega'
                  ? `Entrega ao endereço: ${encomenda.entrega.morada}`
                  : 'Levantamento'}
              </p>

              {utilizador.papel === 'produtor' &&
                PROXIMO_ESTADO[encomenda.estado] && (
                  <button
                    className="btn btn-primary align-self-start"
                    disabled={atualizando === encomenda._id}
                    onClick={() => alterarEstado(encomenda)}
                  >
                    {atualizando === encomenda._id
                      ? 'Atualizando...'
                      : `Avançar para ${PROXIMO_ESTADO[encomenda.estado]}`}
                  </button>
                )}

              {utilizador.papel === 'comprador' &&
                encomenda.estado === 'entregue' && (
                  <section className="border-top mt-3 pt-3">
                    <h2 className="h5">Avaliar esta encomenda</h2>

                    {avaliacoesEnviadas[encomenda._id] ? (
                      <p className="text-success mb-0">
                        Esta encomenda já foi avaliada.
                      </p>
                    ) : (
                      <form onSubmit={(evento) => enviarAvaliacao(evento, encomenda)}>
                        <div className="mb-3">
                          <label
                            className="form-label"
                            htmlFor={`classificacao-${encomenda._id}`}
                          >
                            Sua nota
                          </label>

                          <select
                            id={`classificacao-${encomenda._id}`}
                            className="form-select"
                            value={formulario.classificacao}
                            onChange={(evento) =>
                              alterarFormulario(
                                encomenda._id,
                                'classificacao',
                                evento.target.value
                              )
                            }
                          >
                            <option value={5}>5 - Excelente</option>
                            <option value={4}>4 - Muito bom</option>
                            <option value={3}>3 - Bom</option>
                            <option value={2}>2 - Regular</option>
                            <option value={1}>1 - Ruim</option>
                          </select>
                        </div>

                        <div className="mb-3">
                          <label
                            className="form-label"
                            htmlFor={`comentario-${encomenda._id}`}
                          >
                            Comentário (opcional)
                          </label>

                          <textarea
                            id={`comentario-${encomenda._id}`}
                            className="form-control"
                            rows="3"
                            maxLength={1000}
                            value={formulario.comentario}
                            onChange={(evento) =>
                              alterarFormulario(
                                encomenda._id,
                                'comentario',
                                evento.target.value
                              )
                            }
                            placeholder="Conte como foi sua experiência..."
                          />
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={enviandoAvaliacao === encomenda._id}
                        >
                          {enviandoAvaliacao === encomenda._id
                            ? 'Enviando avaliação...'
                            : 'Enviar avaliação'}
                        </button>
                      </form>
                    )}

                    {mensagem && (
                      <div className={`alert alert-${mensagem.tipo} mt-3 mb-0`}>
                        {mensagem.texto}
                      </div>
                    )}
                  </section>
                )}
            </div>
          );
        })
      )}
    </>
  );
}