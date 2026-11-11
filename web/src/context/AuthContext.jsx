import { createContext, useContext, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sessao')) || null;
    } catch {
      return null;
    }
  });

  async function entrar(email, password) {
    const resposta = await api('/auth/login', {
      metodo: 'POST',
      corpo: { email, password }
    });

    guardarSessao({
      token: resposta.token,
      utilizador: resposta.utilizador
    });

    return resposta.utilizador;
  }

  function sair() {
    localStorage.removeItem('sessao');
    setSessao(null);
  }

  function guardarSessao(nova) {
    localStorage.setItem('sessao', JSON.stringify(nova));
    setSessao(nova);
  }

  return (
    <AuthContext.Provider
      value={{
        utilizador: sessao?.utilizador || null,
        token: sessao?.token || null,
        entrar,
        sair,
        guardarSessao
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);