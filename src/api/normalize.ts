/**
 * Helpers para normalizar respostas da API que podem variar de formato
 * (array direto, {data: [...]}, {data: {data: [...]}} etc).
 */

export function normalizeArrayResponse<T>(resp: unknown): T[] {
  if (Array.isArray(resp)) return resp as T[]

  if (resp && typeof resp === 'object') {
    const obj = resp as Record<string, unknown>

    if (Array.isArray(obj.data)) return obj.data as T[]

    if (obj.data && typeof obj.data === 'object') {
      const dataObj = obj.data as Record<string, unknown>
      if (Array.isArray(dataObj.data)) return dataObj.data as T[]
    }
  }

  return []
}

