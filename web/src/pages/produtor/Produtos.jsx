
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CATEGORIAS = [
    'Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Padaria', 'Outros'
];

const EPOCAS = ['Primavera', 'Verão', 'Outono', 'Inverno'];

const FORMULARIO_INICIAL = {
    nome: '',
    categoria: 'Fruta',
    preco: '',
    unidade: 'kg',
    stock: '0',
    biologico: false,
    epocas: []
};

export default function Produtos() {
    const { token, utilizador } = useAuth();

    const [produtos, setProdutos] = useState([]);
    const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
    const [produtoEditando, setProdutoEditando] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [imagem, setImagem] = useState(null);
    const [enviandoImagem, setEnviandoImagem] = useState(false);

    async function carregarProdutos() {
        try {
            const dados = await api('/products');

            const idProdutor = String(utilizador?.id || utilizador?._id || '');

            setProdutos(dados.filter((produto) =>
                String(produto.produtor?._id || produto.produtor?.id || '') === idProdutor
            ));
        } catch (e) {
            setErro(`Não foi possível carregar os produtos: ${e.message}`);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarProdutos();
    }, [utilizador]);

    function atualizarCampo(e) {
        const { name, value, type, checked } = e.target;

        setFormulario((atual) => ({
            ...atual,
            [name]: type === 'checkbox' ? checked : value
        }));
    }

    function alternarEpoca(epoca) {
        setFormulario((atual) => ({
            ...atual,
            epocas: atual.epocas.includes(epoca)
                ? atual.epocas.filter((item) => item !== epoca)
                : [...atual.epocas, epoca]
        }));
    }


    function editarProduto(produto) {
        setProdutoEditando(produto._id);

        setFormulario({
            nome: produto.nome,
            categoria: produto.categoria,
            preco: String(produto.preco),
            unidade: produto.unidade,
            stock: String(produto.stock),
            biologico: produto.biologico,
            epocas: produto.epocas || []
        });
        setImagem(null);
        setErro('');
        setSucesso('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelarEdicao() {
        setImagem(null);
        setProdutoEditando(null);
        setFormulario(FORMULARIO_INICIAL);
        setErro('');
        setSucesso('');
    }


    async function salvarProduto(e) {
        e.preventDefault();
        setErro('');
        setSucesso('');
        setEnviando(true);

        try {
            const corpo = {
                ...formulario,
                preco: Number(formulario.preco),
                stock: Number(formulario.stock)
            };

            let produtoSalvo;

            if (produtoEditando) {
                produtoSalvo = await api(`/products/${produtoEditando}`, {
                    metodo: 'PUT',
                    token,
                    corpo
                });
            } else {
                produtoSalvo = await api('/products', {
                    metodo: 'POST',
                    token,
                    corpo
                });
            }

            // Guarda o ID para permitir tentar novamente caso o upload falhe.
            setProdutoEditando(produtoSalvo._id);

            if (imagem) {
                setEnviandoImagem(true);

                const dadosImagem = new FormData();
                dadosImagem.append('imagem', imagem);

                await api(`/products/${produtoSalvo._id}/imagem`, {
                    metodo: 'POST',
                    token,
                    corpo: dadosImagem
                });
            }

            setSucesso(
                imagem
                    ? 'Produto salvo e fotografia enviada com sucesso!'
                    : 'Produto salvo com sucesso!'
            );

            setProdutoEditando(null);
            setFormulario(FORMULARIO_INICIAL);
            setImagem(null);

            await carregarProdutos();
        } catch (e) {
            setErro(e.message);
        } finally {
            setEnviando(false);
            setEnviandoImagem(false);
        }
    }


    async function excluirProduto(id) {
        const confirmar = window.confirm(
            'Tem certeza de que deseja excluir este produto?'
        );

        if (!confirmar) return;

        setErro('');
        setSucesso('');

        try {
            await api(`/products/${id}`, {
                metodo: 'DELETE',
                token
            });

            setSucesso('Produto excluído com sucesso!');
            await carregarProdutos();
        } catch (e) {
            setErro(e.message);
        }
    }


    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Meus produtos</h1>
                <Link to="/produtor" className="btn btn-outline-secondary">
                    Voltar ao painel
                </Link>
            </div>

            {erro && <div className="alert alert-danger">{erro}</div>}
            {sucesso && <div className="alert alert-success">{sucesso}</div>}

            <section className="card p-3 mb-4">
                <h2 className="h4 mb-3">
                    {produtoEditando ? 'Editar produto' : 'Cadastrar produto'}
                </h2>

                <form onSubmit={salvarProduto}>
                    <div className="mb-3">
                        <label htmlFor="nome" className="form-label">Nome do produto</label>
                        <input
                            id="nome"
                            name="nome"
                            className="form-control"
                            value={formulario.nome}
                            onChange={atualizarCampo}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="categoria" className="form-label">Categoria</label>
                            <select
                                id="categoria"
                                name="categoria"
                                className="form-select"
                                value={formulario.categoria}
                                onChange={atualizarCampo}
                            >
                                {CATEGORIAS.map((categoria) => (
                                    <option key={categoria} value={categoria}>{categoria}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6 mb-3">
                            <label htmlFor="unidade" className="form-label">Unidade</label>
                            <select
                                id="unidade"
                                name="unidade"
                                className="form-select"
                                value={formulario.unidade}
                                onChange={atualizarCampo}
                            >
                                {['kg', 'unid.', 'garrafa', '500 g', 'litro', 'caixa'].map((unidade) => (
                                    <option key={unidade} value={unidade}>{unidade}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="preco" className="form-label">Preço (€)</label>
                            <input
                                id="preco"
                                name="preco"
                                type="number"
                                className="form-control"
                                min="0"
                                step="0.01"
                                value={formulario.preco}
                                onChange={atualizarCampo}
                                required
                            />
                        </div>

                        <div className="col-md-6 mb-3">
                            <label htmlFor="stock" className="form-label">Stock disponível</label>
                            <input
                                id="stock"
                                name="stock"
                                type="number"
                                className="form-control"
                                min="0"
                                step="1"
                                value={formulario.stock}
                                onChange={atualizarCampo}
                                required
                            />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="imagem" className="form-label">
                            Fotografia do produto
                        </label>

                        <input
                            id="imagem"
                            type="file"
                            className="form-control"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => setImagem(e.target.files[0] || null)}
                        />

                        <small className="text-muted">
                            Formatos aceitos: JPEG, PNG e WebP. Tamanho máximo: 5 MB.
                        </small>

                        {imagem && (
                            <p className="mt-2 mb-0">
                                Imagem selecionada: {imagem.name}
                            </p>
                        )}
                    </div>
                    <div className="form-check mb-3">
                        <input
                            id="biologico"
                            name="biologico"
                            type="checkbox"
                            className="form-check-input"
                            checked={formulario.biologico}
                            onChange={atualizarCampo}
                        />
                        <label htmlFor="biologico" className="form-check-label">
                            Produto biológico
                        </label>
                    </div>

                    <fieldset className="mb-3">
                        <legend className="form-label">Épocas de produção</legend>

                        {EPOCAS.map((epoca) => (
                            <div className="form-check form-check-inline" key={epoca}>
                                <input
                                    id={`epoca-${epoca}`}
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={formulario.epocas.includes(epoca)}
                                    onChange={() => alternarEpoca(epoca)}
                                />
                                <label htmlFor={`epoca-${epoca}`} className="form-check-label">
                                    {epoca}
                                </label>
                            </div>
                        ))}
                    </fieldset>

                    <div className="d-flex gap-2">
                        <button
                            type="submit"
                            className="btn btn-success flex-grow-1"
                            disabled={enviando || enviandoImagem}
                        >
                            {enviandoImagem
                                ? 'Enviando fotografia...'
                                : enviando
                                    ? 'Salvando produto...'
                                    : produtoEditando
                                        ? 'Salvar alterações'
                                        : 'Cadastrar produto'}
                        </button>

                        {produtoEditando && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={cancelarEdicao}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section>
                <h2 className="h4 mb-3">Produtos cadastrados</h2>

                {carregando ? (
                    <p>A carregar produtos...</p>
                ) : produtos.length === 0 ? (
                    <p className="text-muted">Ainda não cadastrou nenhum produto.</p>
                ) : (
                    <div className="row g-3">
                        {produtos.map((produto) => (
                            <div className="col-md-6 col-lg-4" key={produto._id}>
                                <div className="card h-100 p-3">
                                    {produto.imagemUrl && (
                                        <img
                                            src={produto.imagemUrl}
                                            alt={`Fotografia de ${produto.nome}`}
                                            className="card-img-top mb-3"
                                            style={{
                                                height: '180px',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    )}

                                    <h3 className="h5">{produto.nome}</h3>
                                    <p className="mb-1">Categoria: {produto.categoria}</p>
                                    <p className="mb-1">Preço: {produto.preco.toFixed(2)} € / {produto.unidade}</p>
                                    <p className="mb-1">Stock: {produto.stock}</p>
                                    <div className="d-flex gap-2 mt-3">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary flex-grow-1"
                                            onClick={() => editarProduto(produto)}
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-danger flex-grow-1"
                                            onClick={() => excluirProduto(produto._id)}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
