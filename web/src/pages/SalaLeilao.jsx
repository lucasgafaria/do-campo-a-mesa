
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLeilao } from '../hooks/useLeilao.js';

function moeda(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'EUR'
  });
}

function formatarData(data) {
  if (!data) return 'Não informada';

  return new Date(data).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

export default function SalaLeilao() {
  const { id } = useParams();
  const { token, utilizador } = useAuth();

  const {
  leilao,
  atual,
  licitacoes,
  participantes,
  erro,
  carregando,
  encerramento,
  licitar
} = useLeilao(id, token);

  const [valor, setValor] = useState('');
  const [erroFormulario, setErroFormulario] = useState('');

 

  if (carregando && !leilao) {
    return <main className="container py-4">
      <p>Carregando sala do leilão...</p>
    </main>;
  }

  if (!leilao) {
    return <main className="container py-4">
      <div className="alert alert-danger">
        Não foi possível carregar o leilão.
        {erro && <p className="mb-0">{erro}</p>}
      </div>
    </main>;
  }

  const agora = new Date();
  const inicio = new Date(leilao.iniciaEm);
  const termino = new Date(leilao.terminaEm);

  const estadoAtual = agora < inicio
    ? 'agendado'
    : agora >= termino
      ? 'terminado'
      : 'ativo';

  const estadoTexto = {
    agendado: 'Agendado',
    ativo: 'Em andamento',
    terminado: 'Terminado'
  };

  const valorAtual = Number(
    atual?.valor ?? leilao.licitacaoAtual?.valor ?? leilao.precoBase
  );

 const estadoFinal = encerramento || (
    estadoAtual === 'terminado'
      ? { valorFinal: valorAtual, vencedor: leilao.licitacaoAtual?.comprador }
      : null
  );

  const incremento = Number(leilao.incremento);
  const proximaOferta = valorAtual + incremento;

  const idUtilizador = String(utilizador?.id || utilizador?._id || '');
  const idProdutor = String(leilao.produtor?._id || '');
  const ehProdutor = idUtilizador === idProdutor;

  const podeLicitar =
    utilizador?.papel === 'comprador' &&
    !ehProdutor &&
    estadoAtual === 'ativo';

 async function enviarLicitacao(e) {
  e.preventDefault();
  setErroFormulario('');

  const oferta = Number(valor);

  if (!Number.isFinite(oferta) || oferta < proximaOferta) {
    setErroFormulario(
      `A oferta mínima é ${moeda(proximaOferta)}.`
    );
    return;
  }

  const aceita = await licitar(oferta);

  if (aceita) {
    setValor('');
  }
}


  return (
    <main className="container py-4">
      <div className="mb-4">
        <span className={`badge mb-2 ${
          estadoAtual === 'ativo'
            ? 'bg-success'
            : estadoAtual === 'agendado'
              ? 'bg-warning text-dark'
              : 'bg-secondary'
        }`}>
          {estadoTexto[estadoAtual]}
        </span>

        <h1 className="mb-2">{leilao.lote}</h1>

        <p className="text-muted">
          Leilão organizado por{' '}
          <strong>
            {leilao.produtor?.produtor?.nomeExploracao ||
              leilao.produtor?.nome ||
              'Produtor'}
          </strong>
        </p>
      </div>
      
            {estadoFinal && (
        <div className="alert alert-info mb-4">
          <strong>Leilão encerrado!</strong>
          {encerramento?.mensagem && (
            <p className="mb-1">{encerramento.mensagem}</p>
          )}
          {estadoFinal.valorFinal != null && (
            <p className="mb-0">
              Valor final: {moeda(estadoFinal.valorFinal)}
            </p>
          )}
        </div>
      )}

      <div className="row g-4">
        <section className="col-12 col-lg-7">
          {leilao.produto?.imagemUrl ? (
            <img
              src={leilao.produto.imagemUrl}
              alt={leilao.lote}
              className="img-fluid rounded shadow-sm w-100 mb-4"
              style={{ maxHeight: '380px', objectFit: 'cover' }}
            />
          ) : (
            <div className="bg-light rounded d-flex align-items-center justify-content-center mb-4"
              style={{ minHeight: '220px' }}>
              <span className="text-muted">Sem fotografia disponível</span>
            </div>
          )}

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 mb-3">Detalhes do lote</h2>

              <p>
                <strong>Produto associado:</strong>{' '}
                {leilao.produto?.nome || 'Lote personalizado'}
              </p>

              <p>
                <strong>Quantidade:</strong>{' '}
                {leilao.quantidade || 'Não especificada'}
              </p>

              <p>
                <strong>Preço-base:</strong>{' '}
                {moeda(leilao.precoBase)}
              </p>

              <p>
                <strong>Incremento mínimo:</strong>{' '}
                {moeda(leilao.incremento)}
              </p>

              <p>
                <strong>Início:</strong>{' '}
                {formatarData(leilao.iniciaEm)}
              </p>

              <p className="mb-0">
                <strong>Encerramento:</strong>{' '}
                {formatarData(leilao.terminaEm)}
              </p>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">
                Histórico de licitações
              </h2>

              {licitacoes.length === 0 ? (
                <p className="text-muted mb-0">
                  Ainda não existem licitações neste leilão.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>Valor</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licitacoes.map((licitacao) => (
                        <tr key={licitacao._id}>
                          <td>
                            {licitacao.comprador?.nome || 'Participante'}
                          </td>
                          <td className="fw-semibold">
                            {moeda(licitacao.valor)}
                          </td>
                          <td>
                            {formatarData(licitacao.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="col-12 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">
                Pessoas a assistir
              </p>

              <p className="h4 mb-4">
                {participantes}
              </p>

              <p className="text-muted mb-1">
                Licitação atual
              </p>

              <p className="display-5 fw-bold text-success mb-4">
                {moeda(valorAtual)}
              </p>

              <p>
                <strong>Próxima oferta mínima:</strong>{' '}
                {moeda(proximaOferta)}
              </p>

              {podeLicitar ? (
                <form onSubmit={enviarLicitacao}>
                  <label htmlFor="valor" className="form-label">
                    O seu valor (€)
                  </label>

                  <input
                    id="valor"
                    type="number"
                    step="0.01"
                    min={proximaOferta.toFixed(2)}
                    className="form-control mb-3"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder={proximaOferta.toFixed(2)}
                    required
                  />

                  <button
                    type="submit"
                    className="btn btn-success w-100"
                  >
                    Licitar
                  </button>
                </form>
              ) : (
                <div className="alert alert-info mb-0">
                  {ehProdutor
                    ? 'Você é o produtor deste leilão e não pode licitar no próprio lote.'
                    : estadoAtual === 'agendado'
                      ? 'Este leilão ainda não começou.'
                      : estadoAtual === 'terminado'
                        ? 'Este leilão já foi encerrado.'
                        : 'Apenas compradores podem participar nas licitações.'}
                </div>
              )}

              {(erroFormulario || erro) && (
                <div className="alert alert-warning mt-3 mb-0">
                  {erroFormulario || erro}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}