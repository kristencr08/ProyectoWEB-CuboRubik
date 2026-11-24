//Validaciones del formulario de clientes (las mismas reglas que aplica el backend).
//Aquí sirven para avisar al usuario de inmediato; la validación que protege los datos es la del backend.
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

//Mientras se escribe: el documento solo admite numeros y guiones
export const soloDocumento = (valor) => valor.replace(/[^\d-]/g, '')

//El telefono solo admite numeros y guiones
export const soloTelefono = (valor) => valor.replace(/[^\d-]/g, '')

//Devuelve un mensaje de error, o '' si todo esta bien
export function validarCliente({ nombre, documento, telefono, correo }) {
  if (!nombre.trim()) return 'El nombre es obligatorio'

  if (!documento.trim()) return 'El documento es obligatorio'
  const digitosDoc = documento.replace(/\D/g, '').length
  if (digitosDoc !== 9 && digitosDoc !== 14) {
    return 'El documento debe ser un DUI (9 dígitos) o un NIT (14 dígitos)'
  }

  if (telefono.trim() && telefono.replace(/\D/g, '').length !== 8) {
    return 'El teléfono debe tener 8 dígitos'
  }

  if (correo.trim() && !REGEX_CORREO.test(correo.trim())) {
    return 'El correo no es válido'
  }

  return ''
}
