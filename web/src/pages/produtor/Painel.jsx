
import { Link } from 'react-router-dom';

export default function PainelProdutor() {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="mb-0">Painel do produtor</h1>
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/produtor/produtos" className="btn btn-primary">
            Gerenciar produtos
          </Link>
          <Link to="/produtor/leiloes/novo" className="btn btn-success">
            Criar leilão
          </Link>
        </div>
      </div>

      <p className="text-muted">
        Bem-vindo ao seu painel de gestão. Aqui você pode administrar seus
        produtos e criar leilões.
      </p>
    </>
  );
}