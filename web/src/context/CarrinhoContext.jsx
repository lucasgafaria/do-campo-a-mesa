
import { createContext, useContext, useMemo, useState } from 'react';

const CarrinhoContext = createContext(null);

export function CarrinhoProvider({ children }) {
  const [linhas, setLinhas] = useState([]);

  function adicionar(produto, quantidade = 1) {
    setLinhas((atual) => {
      const existe = atual.find((l) => l.produto._id === produto._id);

      if (existe) {
        return atual.map((l) =>
          l.produto._id === produto._id
            ? { ...l, quantidade: l.quantidade + quantidade }
            : l
        );
      }

      return [...atual, { produto, quantidade }];
    });
  }

  function alterarQuantidade(produtoId, quantidade) {
    const novaQuantidade = Number(quantidade);

    if (!Number.isInteger(novaQuantidade) || novaQuantidade < 1) {
      return;
    }

    setLinhas((atual) =>
      atual.map((l) =>
        l.produto._id === produtoId
          ? { ...l, quantidade: novaQuantidade }
          : l
      )
    );
  }

  function remover(produtoId) {
    setLinhas((atual) =>
      atual.filter((l) => l.produto._id !== produtoId)
    );
  }

  function limpar() {
    setLinhas([]);
  }

  const total = useMemo(
    () =>
      linhas.reduce(
        (soma, l) => soma + l.produto.preco * l.quantidade,
        0
      ),
    [linhas]
  );

  return (
    <CarrinhoContext.Provider
      value={{
        linhas,
        adicionar,
        alterarQuantidade,
        remover,
        limpar,
        total
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export const useCarrinho = () => useContext(CarrinhoContext);