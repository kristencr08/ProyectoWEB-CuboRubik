export const money = (n) => `$${Number(n || 0).toFixed(2)}`

export const fecha = (f) => (f ? new Date(f).toLocaleString('es-SV') : '-')

export const nombreDocumento = (tipo) =>
  tipo === 'CCF' ? 'Crédito fiscal (CCF)' : 'Factura consumidor final'
