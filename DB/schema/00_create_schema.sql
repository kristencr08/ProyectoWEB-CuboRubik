
-- ============================================
-- PROYECTO: RESTAURANTE ORIGENES SV
-- MODULO: BASE DE DATOS
-- DESCRIPCION: Creacion del esquema principal
-- ============================================

-- Crear esquema principal del modulo
CREATE SCHEMA IF NOT EXISTS core;

-- Establecer esquema de trabajo
SET search_path TO core, public;

-- Verificar esquema creado
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'core';
