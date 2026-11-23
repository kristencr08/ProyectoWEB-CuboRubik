// Funciones y constantes de formato que comparten las pantallas de inventario.
// (Si prefieres, puedes mover estas funciones a utils/formato.js del módulo 6.)

// Las cantidades llegan del backend como texto ("12.500"), por eso se convierten a número.
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
