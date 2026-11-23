import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Table, Badge, Button, Input, Alert, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter,
} from 'reactstrap'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { fmtCosto } from '../utils/formatoInventario'
import GrupoFiltro from '../components/GrupoFiltro'
import ModalReceta from '../components/recetas/ModalReceta'
import ModalDetalleReceta from '../components/recetas/ModalDetalleReceta'

// El backend (recetasRoutes) deja consultar a cualquier usuario autenticado,
// pero solo ADMINISTRADOR y GERENTE pueden crear, editar o activar recetas.
const ROLES_GESTION = ['ADMINISTRADOR', 'GERENTE']

export default function Recetas() {
  const { user } = useAuth()
  const puedeGestionar = ROLES_GESTION.includes(String(user?.rol).toUpperCase())

  // Cada elemento es un producto ELABORADO, con su receta (si ya la tiene)
  const [productos, setProductos] = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroReceta, setFiltroReceta] = useState('')

  // null = sin modal, o { tipo: 'ver' | 'editar', producto }
  const [modal, setModal] = useState(null)
  // Producto cuya receta se va a activar o desactivar (pide confirmación)
  const [confirmar, setConfirmar] = useState(null)
  const [cambiando, setCambiando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      // Las dos consultas son independientes, se lanzan al mismo tiempo
      const [resRecetas, resIngredientes] = await Promise.all([
        api.recetas(),
        api.ingredientes(),
      ])
      setProductos(resRecetas.recetas)
      setIngredientes(resIngredientes.ingredientes.filter((i) => i.activo))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter(
      (p) =>
        (filtroReceta === '' ||
          (filtroReceta === 'con' ? p.receta_id !== null : p.receta_id === null)) &&
        (!texto ||
          p.producto.toLowerCase().includes(texto) ||
          (p.codigo || '').toLowerCase().includes(texto)),
    )
  }, [productos, busqueda, filtroReceta])

  const alGuardar = (texto) => {
    setModal(null)
    setMensaje(texto)
    cargar()
  }

  const cambiarEstado = async () => {
    setCambiando(true)
    try {
      await api.estadoReceta(confirmar.producto_id, !confirmar.receta_activa)
      setMensaje(
        `Receta de "${confirmar.producto}" ${confirmar.receta_activa ? 'desactivada' : 'activada'}.`,
      )
      cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setCambiando(false)
      setConfirmar(null)
    }
  }

  const estadoDe = (p) => {
    if (p.receta_id === null) return { color: 'secondary', texto: 'Sin receta' }
    return p.receta_activa
      ? { color: 'success', texto: 'Activa' }
      : { color: 'secondary', texto: 'Inactiva' }
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Recetas</h2>
        <Button color="outline-secondary" onClick={cargar} disabled={cargando}>
          <i className="bi bi-arrow-clockwise me-1" />
          Actualizar
        </Button>
      </div>

      {error && <Alert color="danger" toggle={() => setError('')}>{error}</Alert>}
      {mensaje && (
        <Alert color="success" toggle={() => setMensaje('')}>
          {mensaje}
        </Alert>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Input
          placeholder="Buscar por producto o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <GrupoFiltro
          opciones={[
            ['', 'Todos'],
            ['con', 'Con receta'],
            ['sin', 'Sin receta'],
          ]}
          valor={filtroReceta}
          onChange={setFiltroReceta}
        />
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-end">Costo</th>
                <th className="text-end">Margen</th>
                <th className="text-center">Ingredientes</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    {productos.length === 0
                      ? 'No hay productos elaborados registrados.'
                      : 'No hay productos que coincidan con los filtros.'}
                  </td>
                </tr>
              )}
              {visibles.map((p) => {
                const tiene = p.receta_id !== null
                const precio = Number(p.precio_venta)
                const margen = precio - Number(p.costo_unitario)
                const estado = estadoDe(p)
                return (
                  <tr key={p.producto_id}>
                    <td>
                      {p.producto}
                      <div className="small text-muted">{p.codigo}</div>
                    </td>
                    <td className="text-end">{fmtCosto(precio)}</td>
                    <td className="text-end">{tiene ? fmtCosto(p.costo_unitario) : '—'}</td>
                    <td className="text-end">
                      {tiene && precio > 0 ? (
                        <span className={margen < 0 ? 'text-danger' : ''}>
                          {Math.round((margen / precio) * 100)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-center">{p.ingredientes.length}</td>
                    <td>
                      <Badge color={estado.color}>{estado.texto}</Badge>
                    </td>
                    <td className="text-end text-nowrap">
                      {tiene && (
                        <Button
                          size="sm"
                          color="outline-secondary"
                          className="me-1"
                          onClick={() => setModal({ tipo: 'ver', producto: p })}
                        >
                          Ver
                        </Button>
                      )}
                      {puedeGestionar && (
                        <Button
                          size="sm"
                          color="outline-secondary"
                          className="me-1"
                          onClick={() => setModal({ tipo: 'editar', producto: p })}
                        >
                          {tiene ? 'Editar' : 'Crear receta'}
                        </Button>
                      )}
                      {puedeGestionar && tiene && (
                        <Button
                          size="sm"
                          color="outline-secondary"
                          onClick={() => setConfirmar(p)}
                        >
                          {p.receta_activa ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      {modal?.tipo === 'ver' && (
        <ModalDetalleReceta producto={modal.producto} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'editar' && (
        <ModalReceta
          producto={modal.producto}
          ingredientes={ingredientes}
          onClose={() => setModal(null)}
          onGuardado={alGuardar}
        />
      )}

      {/* Confirmación para activar o desactivar una receta */}
      <Modal isOpen={!!confirmar} toggle={() => setConfirmar(null)} centered>
        <ModalHeader toggle={() => setConfirmar(null)}>
          {confirmar?.receta_activa ? 'Desactivar receta' : 'Activar receta'}
        </ModalHeader>
        <ModalBody>
          {confirmar?.receta_activa
            ? `Con la receta inactiva, el punto de venta no podrá vender "${confirmar?.producto}" hasta que la actives de nuevo.`
            : `Al activar la receta, "${confirmar?.producto}" se podrá vender otra vez y descontará sus ingredientes del inventario.`}
        </ModalBody>
        <ModalFooter>
          <Button color="outline-secondary" onClick={() => setConfirmar(null)} disabled={cambiando}>
            Cancelar
          </Button>
          <Button color="warning" onClick={cambiarEstado} disabled={cambiando}>
            {cambiando ? <Spinner size="sm" /> : 'Confirmar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
