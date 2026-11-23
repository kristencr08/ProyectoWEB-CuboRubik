// Funciones y constantes de formato que comparten las pantallas de inventario.

export const fmtCantidad = (n) =>
  Number(n ?? 0).toLocaleString('es-SV', { maximumFractionDigits: 3 })

export const fmtCosto = (n) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('es-SV', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })

export const fmtFecha = (f) => (f ? new Date(f).toLocaleString('es-SV') : '—')

// Solo la fecha, sin hora (por ejemplo, el vencimiento de una cuenta)
export const fmtDia = (f) => (f ? new Date(f).toLocaleDateString('es-SV') : '—')

// El backend maneja dos tipos de artículo: ingredientes y productos de reventa
export const ETIQUETA_TIPO = {
  INGREDIENTE: 'Ingrediente',
  PRODUCTO_DIRECTO: 'Reventa',
}

// estado_stock lo calcula el backend (stockService.consultarInventario)
export const ESTADO_STOCK = {
  OK: { color: 'success', texto: 'En orden' },
  BAJO: { color: 'warning', texto: 'Stock bajo' },
  SIN_STOCK: { color: 'danger', texto: 'Sin stock' },
}

export const COLOR_MOVIMIENTO = {
  ENTRADA: 'success',
  SALIDA: 'secondary',
  AJUSTE: 'info',
}

// Estados de una compra (el backend los llama PENDIENTE, RECIBIDA y ANULADA)
export const ESTADO_COMPRA = {
  PENDIENTE: { color: 'warning', texto: 'Pendiente' },
  RECIBIDA: { color: 'success', texto: 'Recibida' },
  ANULADA: { color: 'secondary', texto: 'Anulada' },
}