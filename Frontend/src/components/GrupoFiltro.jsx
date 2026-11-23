import { ButtonGroup, Button } from 'reactstrap'

// Filtro de botones agrupados (como "Todas | Consumidor final | CCF" en Facturas).
// opciones: arreglo de [clave, texto]. valor: la clave seleccionada.
// Usa los mismos colores que Facturas: 'warning' para el activo y 'outline-secondary' para el resto.
export default function GrupoFiltro({ opciones, valor, onChange }) {
  return (
    <ButtonGroup>
      {opciones.map(([clave, texto]) => (
        <Button
          key={clave}
          color={valor === clave ? 'warning' : 'outline-secondary'}
          onClick={() => onChange(clave)}
        >
          {texto}
        </Button>
      ))}
    </ButtonGroup>
  )
}
