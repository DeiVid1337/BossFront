/**
 * Utilitário para acessar variáveis de ambiente
 */

/**
 * Garante que a URL seja absoluta (com protocolo).
 * Se não tiver http:// ou https://, o browser trata como caminho relativo
 * e junta ao domínio do front (ex.: boss-front.vercel.app + "api.railway.app" vira boss-front.vercel.app/api.railway.app).
 */
function ensureAbsoluteUrl(url: string): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  }
  return `https://${trimmed.startsWith('/') ? trimmed.slice(1) : trimmed}`.replace(/\/+$/, '')
}

/**
 * Retorna a URL base da API configurada nas variáveis de ambiente.
 * Em desenvolvimento, usa http://localhost:8000/api/v1.
 * Em produção, usa VITE_API_BASE_URL (sempre normalizada como URL absoluta).
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return ensureAbsoluteUrl(envUrl)
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api/v1'
  }

  return 'http://localhost:8000/api/v1'
}
