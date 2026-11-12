
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Registo() {
  const { guardarSessao } = useAuth();
  const navigate = useNavigate();

  const [dados, setDados] = useState({
    nome: '',
    email: '',
    password: '',
    papel: 'comprador',
    nomeExploracao: '',
    localidade: ''
  });

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function atualizarCampo(e) {
    setDados({
      ...dados,
      [e.target.name]: e.target.value
    });
  }

  async function submeter(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const corpo = {
        nome: dados.nome,
        email: dados.email,
        password: dados.password,
        papel: dados.papel
      };

      if (dados.papel === 'produtor') {
        corpo.produtor = {
          nomeExploracao: dados.nomeExploracao,
          localidade: dados.localidade
        };
      }

      const resposta = await api('/auth/registo', {
        metodo: 'POST',
        corpo
      });

      guardarSessao({
        token: resposta.token,
        utilizador: resposta.utilizador
      });

      navigate('/');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form className="formulario-estreito" onSubmit={submeter}>
      <h1>Criar conta</h1>

      <p className="text-muted">
        Registe-se para começar a utilizar a plataforma.
      </p>

      <label htmlFor="nome" className="form-label">
        Nome completo
      </label>
      <input
        id="nome"
        name="nome"
        type="text"
        className="form-control mb-3"
        value={dados.nome}
        onChange={atualizarCampo}
        required
      />

      <label htmlFor="email" className="form-label">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        className="form-control mb-3"
        value={dados.email}
        onChange={atualizarCampo}
        required
      />

      <label htmlFor="password" className="form-label">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        className="form-control mb-3"
        minLength={8}
        value={dados.password}
        onChange={atualizarCampo}
        required
      />

      <label htmlFor="papel" className="form-label">
        Tipo de conta
      </label>
      <select
        id="papel"
        name="papel"
        className="form-select mb-3"
        value={dados.papel}
        onChange={atualizarCampo}
      >
        <option value="comprador">Comprador</option>
        <option value="produtor">Produtor</option>
      </select>

      {dados.papel === 'produtor' && (
        <>
          <label htmlFor="nomeExploracao" className="form-label">
            Nome da exploração
          </label>
          <input
            id="nomeExploracao"
            name="nomeExploracao"
            type="text"
            className="form-control mb-3"
            value={dados.nomeExploracao}
            onChange={atualizarCampo}
            required
          />

          <label htmlFor="localidade" className="form-label">
            Localidade
          </label>
          <input
            id="localidade"
            name="localidade"
            type="text"
            className="form-control mb-3"
            value={dados.localidade}
            onChange={atualizarCampo}
            required
          />

          <div className="alert alert-info">
            A conta de produtor ficará pendente de aprovação
            administrativa antes de poder publicar produtos e leilões.
          </div>
        </>
      )}

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-success w-100"
        disabled={carregando}
      >
        {carregando ? 'A criar conta...' : 'Criar conta'}
      </button>

      <p className="text-center mt-3 mb-0">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  );
}