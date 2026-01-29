/**
 * Composable para tratamento centralizado de erros da API
 * Seguindo Frontend.md: encapsula lógica reutilizável
 * Seguindo DevGuide.md: mapear 403/404/409 para mensagens user-friendly
 */

import { ApiError, ValidationError } from '@/api/types'

export interface ErrorMessage {
  message: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Converte erros da API em mensagens amigáveis para o usuário
 */
export function useErrorHandler() {
  function handleApiError(err: unknown): ErrorMessage {
    // ValidationError (422)
    if (err instanceof ValidationError) {
      return {
        message: err.message || 'Erro de validação',
        fieldErrors: err.validationErrors || err.errors,
      }
    }

    // ApiError genérico
    if (err instanceof ApiError) {
      let message = err.message || 'Erro ao processar solicitação'

      // Mapear códigos de status para mensagens amigáveis
      switch (err.status) {
        case 401:
          message = 'Sua sessão expirou. Por favor, faça login novamente.'
          break
        case 403:
          message = 'Você não tem permissão para realizar esta ação.'
          break
        case 404:
          message = 'Recurso não encontrado.'
          break
        case 409:
          message =
            err.message ||
            'Este recurso não pode ser removido pois está sendo utilizado em outras partes do sistema.'
          break
        case 422:
          message = 'Dados inválidos. Verifique os campos do formulário.'
          break
        case 500:
          message = 'Erro interno do servidor. Tente novamente mais tarde.'
          break
        default:
          message = err.message || 'Erro ao processar solicitação'
      }

      return { message }
    }

    // Error genérico
    if (err instanceof Error) {
      return { message: err.message }
    }

    // String ou outro tipo
    if (typeof err === 'string') {
      return { message: err }
    }

    // Erro desconhecido
    return { message: 'Ocorreu um erro inesperado. Tente novamente.' }
  }

  return {
    handleApiError,
  }
}
