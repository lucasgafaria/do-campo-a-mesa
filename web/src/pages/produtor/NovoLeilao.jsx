
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

function dataHoraLocalInicial() {
  const data = new Date(Date.now() + 5 * 60 * 1000);
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 16);
}

export default function NovoLeilao() {
  const { token, utilizador } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);

  const [formulario, setFormulario] = useState({
    produto: '',
    lote: '',
    quantidade: '',
    precoBase: '',
    incremento: '0.50',
    iniciaEm: dataHoraLocalInicial(),
    duracaoMinutos: '60'
  });

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const dados = await api('/products');

        const idProdutor = String(
          utilizador?.id || utilizador?._id || ''
        );

        const meusProdutos = dados.filter((produto) => {
          const idDono = String(
            produto.produtor?._id || produto.produtor?.id || ''
          );

          return idDono === idProdutor;
        });

        setProdutos(meusProdutos);
      } catch (e) {
        setErro(`Não foi possível carregar os produtos: ${e.message}`);
      } finally {
        setCarregandoProdutos(false);
      }
    }

    carregarProdutos();
  }, [utilizador]);

  function atualizarCampo(e) {
    const { name, value } = e.target;

    setFormulario((atual) => ({
      ...atual,
      [name]: value
    }));
  }

  function selecionarProduto(e) {
    const id = e.target.value;

    const produto = produtos.find((item) => item._id === id);

    setFormulario((atual) => ({
      ...atual,
      produto: id,
      lote: produto
        ? `${produto.nome}${atual.quantidade ? ` - ${atual.quantidade}` : ''}`
        : atual.lote
    }));
  }

  async function criarLeilao(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (new Date(formulario.iniciaEm) < new Date()) {
      setErro('A data de início não pode estar no passado.');
      return;
    }

    if (
      !Number.isInteger(Number(formulario.duracaoMinutos)) ||
      Number(formulario.duracaoMinutos) <= 0
    ) {
      setErro('A duração deve ser um número inteiro de minutos positivo.');
      return;
    }

    setEnviando(true);

    try {
      const corpo = {
        lote: formulario.lote,
        quantidade: formulario.quantidade,
        precoBase: Number(formulario.precoBase),
        incremento: Number(formulario.incremento),
        iniciaEm: new Date(formulario.iniciaEm).toISOString(),
        duracaoMinutos: Number(formulario.duracaoMinutos)
      };

      if (formulario.produto) {
        corpo.produto = formulario.produto;
      }

      const resposta = await api('/auctions', {
        metodo: 'POST',
        corpo,
        token
      });

      setSucesso(
        `Leilão criado com sucesso! ID: ${resposta.leilao._id}`
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="container py-4">
      <div className="formulario-estreito">
        <h1 className="mb-3">Criar leilão</h1>

        <p className="text-muted">
          Preencha os dados do lote para disponibilizá-lo em leilão.
        </p>

        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="alert alert-success" role="alert">
            <p className="mb-2">{sucesso}</p>
            <Link to="/leiloes" className="btn btn-success">
              Ver leilões
            </Link>
          </div>
        )}

        <form onSubmit={criarLeilao}>
          <div className="mb-3">
            <label htmlFor="produto" className="form-label">
              Produto cadastrado (opcional)
            </label>

            <select
              id="produto"
              name="produto"
              className="form-select"
              value={formulario.produto}
              onChange={selecionarProduto}
              disabled={carregandoProdutos}
            >
              <option value="">
                {carregandoProdutos
                  ? 'Carregando produtos...'
                  : 'Criar lote sem associar produto'}
              </option>

              {produtos.map((produto) => (
                <option key={produto._id} value={produto._id}>
                  {produto.nome}
                </option>
              ))}
            </select>

            {!carregandoProdutos && produtos.length === 0 && (
              <small className="text-muted">
                Nenhum produto cadastrado nesta conta.
                Você ainda pode criar um lote manualmente.
              </small>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="lote" className="form-label">
              Descrição do lote
            </label>
            <input
              id="lote"
              name="lote"
              type="text"
              className="form-control"
              placeholder="Ex.: 200 kg de kiwi Hayward, calibre A"
              value={formulario.lote}
              onChange={atualizarCampo}
              maxLength={200}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="quantidade" className="form-label">
              Quantidade
            </label>
            <input
              id="quantidade"
              name="quantidade"
              type="text"
              className="form-control"
              placeholder="Ex.: 200 kg"
              value={formulario.quantidade}
              onChange={atualizarCampo}
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="precoBase" className="form-label">
                Preço-base (€)
              </label>
              <input
                id="precoBase"
                name="precoBase"
                type="number"
                className="form-control"
                min="0"
                step="0.01"
                value={formulario.precoBase}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="incremento" className="form-label">
                Incremento mínimo (€)
              </label>
              <input
                id="incremento"
                name="incremento"
                type="number"
                className="form-control"
                min="0.01"
                step="0.01"
                value={formulario.incremento}
                onChange={atualizarCampo}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="iniciaEm" className="form-label">
              Data e hora de início
            </label>
            <input
              id="iniciaEm"
              name="iniciaEm"
              type="datetime-local"
              className="form-control"
              value={formulario.iniciaEm}
              onChange={atualizarCampo}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="duracaoMinutos" className="form-label">
              Duração (minutos)
            </label>
            <input
              id="duracaoMinutos"
              name="duracaoMinutos"
              type="number"
              className="form-control"
              min="1"
              step="1"
              value={formulario.duracaoMinutos}
              onChange={atualizarCampo}
              required
            />
            <small className="text-muted">
              O horário de término será calculado automaticamente.
            </small>
          </div>

          <button
            type="submit"
            className="btn btn-success w-100"
            disabled={enviando}
          >
            {enviando ? 'Criando leilão...' : 'Criar leilão'}
          </button>
        </form>
      </div>
    </main>
  );
}