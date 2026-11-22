import { Card, CardBody } from 'reactstrap'

// Pantalla vacia de un modulo que todavia no esta conectado
// Quien haga ese modulo reemplaza este componente por el suyo en App.jsx
export default function Placeholder({ titulo, responsable }) {
  return (
    <div>
      <h2 className="fw-bold mb-3">{titulo}</h2>
      <Card className="border-0 shadow-sm">
        <CardBody className="text-center text-muted py-5">
          <i className="bi bi-tools fs-1 d-block mb-2" />
          <div className="fw-semibold">Pantalla pendiente de integrar</div>
          {responsable && <div className="small mt-1">{responsable}</div>}
        </CardBody>
      </Card>
    </div>
  )
}
