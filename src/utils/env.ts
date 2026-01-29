/**
 * Utilitário para acessar variáveis de ambiente
 */

/**
 * Retorna a URL base da API configurada nas variáveis de ambiente
 * Em desenvolvimento, usa http://localhost:8000/api/v1
 * Em produção, usa a URL configurada na variável de ambiente
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  // Se há URL configurada, usar ela
  if (envUrl) {
    return envUrl
  }

  // Em desenvolvimento, usar porta 8000 diretamente
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api/v1'
  }

  // Fallback para produção
  return 'http://localhost:8000/api/v1'
}
