
// Cliente HTTP da API: junta o URL base e o token JWT a cada pedido.
export const API_URL = import.meta.env.VITE_API_URL ?? '';
export const USAR_DADOS_SIMULADOS = import.meta.env.VITE_USAR_DADOS_SIMULADOS === 'true';

export async function api(caminho, { metodo = 'GET', corpo, token } = {}) {
  const ehFormData = corpo instanceof FormData;

  const resposta = await fetch(`${API_URL}/api${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo && !ehFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: corpo
      ? ehFormData
        ? corpo
        : JSON.stringify(corpo)
      : undefined
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro ${resposta.status}`);
  }

  return dados;
}