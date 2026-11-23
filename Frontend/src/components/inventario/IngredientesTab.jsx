import { useEffect, useState, useCallback } from 'react'
import { Table, Badge, Button, Alert, Spinner } from 'reactstrap'
import { api } from '../../api/client'
import { fmtCosto } from '../../utils/formatoInventario'
import ModalIngrediente from './ModalIngrediente'

// Catálogo de ingredientes: aquí se crean los insumos que luego usan las recetas y las compras.
export default function IngredientesTab({ puedeGestionar, onCambio }) {
  const [ingredientes, setIngredientes] = useState([])
  const [unidades, setUnidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  // null = modal cerrado, { ingrediente: null } = crear, { ingrediente: {...} } = editar
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // Las dos consultas son independientes, se lanzan al mismo tiempo
      const [resIngredientes, resUnidades] = await Promise.all([
        api.ingredientes(),
        api.unidades(),
      ])
      setIngredientes(resIngredientes.ingredientes)
      setUnidades(resUnidades.unidades)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const alGuardar = (texto) => {
    setModal(null)
    setMensaje(texto)
    cargar()
    onCambio() // refresca también la pestaña de stock
  }

  if (cargando) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" />
      </div>
    )
  }

  return (
    <>
      {error && <Alert color="danger">{error}</Alert>}
      {mensaje && (
        <Alert color="success" toggle={() => setMensaje('')}>
          {mensaje}
        </Alert>
      )}

      {puedeGestionar && (
        <div className="d-flex justify-content-end mb-3">
          <Button color="primary" onClick={() => setModal({ ingrediente: null })}>
            <i className="bi bi-plus-lg me-1" />
            Nuevo ingrediente
          </Button>
        </div>
      )}

      <Table responsive hover className="align-middle">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Unidad</th>
            <th className="text-end">Último costo</th>
            <th>Estado</th>
            {puedeGestionar && <th />}
          </tr>
        </thead>
        <tbody>
          {ingredientes.length === 0 && (
            <tr>
              <td colSpan={puedeGestionar ? 6 : 5} className="text-center text-muted py-4">
                Aún no hay ingredientes registrados.
              </td>
            </tr>
          )}
          {ingredientes.map((ing) => (
            <tr key={ing.ingrediente_id}>
              <td>{ing.codigo}</td>
              <td>
                {ing.nombre}
                {ing.descripcion && (
                  <div className="small text-muted">{ing.descripcion}</div>
                )}
              </td>
              <td>{ing.unidad}</td>
              <td className="text-end">{fmtCosto(ing.ultimo_costo)}</td>
              <td>
                <Badge color={ing.activo ? 'success' : 'secondary'}>
                  {ing.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              {puedeGestionar && (
                <td className="text-end">
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    onClick={() => setModal({ ingrediente: ing })}
                  >
                    Editar
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>

      {modal && (
        <ModalIngrediente
          ingrediente={modal.ingrediente}
          unidades={unidades}
          onClose={() => setModal(null)}
          onGuardado={alGuardar}
        />
      )}
    </>
  )
}
