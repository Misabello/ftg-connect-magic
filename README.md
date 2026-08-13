# Fotográfica Connect

Actuá como arquitecto de software senior, diseñador UX/UI y desarrollador full-stack especializado en ERP, sistemas de punto de venta offline-first, Supabase e inteligencia artificial.

Necesito diseñar y desarrollar el MVP de una plataforma ERP integral para la empresa Fotográfica (FTG):

https://www.fotografica.com/

CONTEXTO DE LA EMPRESA

Fotográfica produce y comercializa merchandising oficial y recuerdos fotográficos en parques temáticos, zoológicos, acuarios, museos, ferias, eventos y sitios turísticos de Argentina y Brasil.

La empresa opera múltiples puntos de venta, algunos permanentes y otros temporales. En muchos de esos lugares la conexión a Internet es inestable o inexistente.

Actualmente utiliza tres sistemas separados:

1. Punto de venta.

2. Administración.

3. Operaciones.

El objetivo es comenzar a reemplazarlos mediante una única plataforma modular, conectada a una base de datos central en Supabase.

La plataforma debe llamarse provisoriamente:

FTG ONE

Sistema Integral de Operaciones

OBJETIVO DEL MVP

Construir un MVP funcional que demuestre cómo los tres sistemas pueden integrarse en una sola plataforma.

El MVP debe incluir:

1. Punto de venta offline-first.

2. Administración y finanzas.

3. Gestión de operaciones.

4. Dashboard ejecutivo.

5. Generación de recuerdos fotográficos mediante IA.

6. Base de datos central en Supabase.

7. Gestión de usuarios, roles, sedes y permisos.

No crear solamente pantallas estáticas. Las funciones principales deben estar conectadas, permitir guardar información y demostrar el flujo completo de una operación.

ARQUITECTURA GENERAL

Crear una aplicación web responsive y PWA instalable.

Stack recomendado:

- Frontend: React + TypeScript + Vite.

- UI: Tailwind CSS + shadcn/ui.

- Backend y base de datos: Supabase.

- Autenticación: Supabase Auth.

- Archivos y fotografías: Supabase Storage.

- Seguridad: Row Level Security.

- Funcionamiento offline: IndexedDB, utilizando Dexie.js u otra biblioteca robusta.

- Estado y consultas: TanStack Query.

- Validaciones: Zod.

- Gráficos: Recharts.

- Idiomas preparados: español y portugués.

- Monedas preparadas: ARS, BRL y USD.

- Fechas, impuestos y formatos configurables por país.

La arquitectura debe ser modular y escalable, pero el alcance inicial debe mantenerse dentro de un MVP.

ESTRUCTURA DE LA PLATAFORMA

Crear un menú lateral principal con los siguientes módulos:

- Inicio

- Punto de venta

- Fotografías

- Operaciones

- Inventario

- Administración

- Clientes

- Reportes

- Configuración

En la parte superior mostrar:

- Sede o evento activo.

- Estado de conexión.

- Estado de sincronización.

- Usuario conectado.

- Notificaciones.

- Selector de idioma.

- Botón de ayuda.

1. DASHBOARD EJECUTIVO

Crear una pantalla inicial con indicadores generales:

- Ventas del día.

- Ventas por sede.

- Ventas de fotografías.

- Ventas de merchandising.

- Ticket promedio.

- Cantidad de operaciones.

- Fotografías capturadas.

- Fotografías vendidas.

- Conversión entre fotografías tomadas y vendidas.

- Stock crítico.

- Cuentas por cobrar.

- Cuentas por pagar.

- Cajas abiertas.

- Dispositivos sin sincronizar.

- Última sincronización por punto de venta.

Incluir gráficos de:

- Ventas por día.

- Ventas por sede.

- Ventas por categoría.

- Comparación entre fotografías y merchandising.

- Medios de pago.

- Productos más vendidos.

- Conversión fotográfica por ubicación.

Permitir filtrar por:

- País.

- Sede.

- Parque o cliente.

- Evento.

- Punto de venta.

- Rango de fechas.

- Categoría de producto.

2. PUNTO DE VENTA OFFLINE-FIRST

Este es el módulo prioritario del MVP.

Debe poder instalarse como PWA en computadoras o tablets y seguir operando sin conexión a Internet.

Pantalla principal del POS:

- Buscador rápido.

- Catálogo visual de productos.

- Categorías.

- Fotografías disponibles.

- Carrito de compra.

- Descuentos autorizados.

- Selección de vendedor.

- Cliente opcional.

- Medio de pago.

- Impresión o envío del comprobante.

- Apertura y cierre de caja.

- Estado online/offline siempre visible.

Categorías iniciales:

- Fotografías.

- Fotografías impresas.

- Fotografías digitales.

- Productos personalizados.

- Merchandising.

- Souvenirs.

- Combos.

- Promociones.

El POS debe permitir:

- Escanear código de barras.

- Buscar por nombre, SKU o categoría.

- Agregar productos al carrito.

- Asociar una fotografía a la venta.

- Aplicar promociones.

- Registrar pagos en efectivo, tarjeta, transferencia u otros medios.

- Registrar pagos combinados.

- Emitir comprobante interno.

- Solicitar factura.

- Guardar la venta aun cuando no exista Internet.

- Consultar operaciones pendientes de sincronización.

- Reintentar una sincronización fallida.

- Evitar que una venta se registre dos veces.

MODO OFFLINE

Cuando no haya Internet:

- Guardar ventas localmente en IndexedDB.

- Guardar identificadores UUID generados en el dispositivo.

- Mantener una copia local del catálogo, precios, promociones, usuarios habilitados y stock disponible.

- Mostrar claramente que la aplicación está trabajando offline.

- Permitir operar durante toda la jornada.

- Crear una cola local de movimientos pendientes.

- No bloquear las ventas por problemas de conectividad.

Cuando regrese Internet:

- Iniciar sincronización automática en segundo plano.

- Enviar las operaciones pendientes a Supabase en lotes.

- Utilizar claves de idempotencia para evitar duplicados.

- Registrar fecha de creación local y fecha de sincronización.

- Confirmar cada lote recibido.

- Reintentar solamente los registros fallidos.

- Mostrar el progreso de sincronización.

- Mantener un historial de errores.

- Permitir sincronización manual.

- Resolver conflictos mediante reglas explícitas.

Reglas iniciales de conflicto:

- Las ventas confirmadas nunca se eliminan.

- Cada venta tiene un UUID único creado en el dispositivo.

- Los movimientos de stock son eventos, no sobrescrituras directas.

- Los precios descargados al inicio del turno se conservan durante la venta.

- Los cambios administrativos realizados en la central se aplican después de sincronizar.

- Toda corrección debe quedar en un registro de auditoría.

Crear una pantalla “Centro de sincronización” con:

- Estado de conexión.

- Última sincronización.

- Cantidad de ventas pendientes.

- Movimientos de stock pendientes.

- Fotografías pendientes.

- Errores detectados.

- Botón “Sincronizar ahora”.

- Historial por dispositivo.

3. FOTOGRAFÍAS Y RECUERDOS CON IA

Crear un flujo específico para la venta de fotografías tomadas en el parque o evento.

Flujo:

1. El fotógrafo captura una fotografía.

2. La fotografía se carga o importa al sistema.

3. Se asocia a una sede, ubicación, fecha, fotógrafo y código identificador.

4. El visitante puede encontrarla mediante un código, QR o búsqueda asistida.

5. El vendedor muestra distintas presentaciones.

6. El cliente puede comprar la fotografía original o solicitar una versión tematizada con IA.

7. El resultado aprobado se agrega al carrito.

8. Se registra la venta y se entrega impresa o digitalmente.

AGENTE DE CREACIÓN DE IMÁGENES

Incluir un módulo de IA llamado:

“Crear recuerdo mágico”

Debe permitir:

- Seleccionar una fotografía del visitante.

- Seleccionar una plantilla temática.

- Elegir formato vertical, horizontal o cuadrado.

- Elegir estilo visual.

- Generar una vista previa de baja resolución.

- Comparar original y resultado.

- Regenerar.

- Aprobar o descartar.

- Agregar el resultado al carrito.

- Guardar el prompt, el modelo utilizado, el consentimiento y el resultado.

Ejemplos de experiencias:

- Encuentro con un dinosaurio.

- Expedición en la selva.

- Mundo submarino.

- Aventura en un acuario.

- Experiencia deportiva.

- Explorador de un parque natural.

- Personaje temático propio del parque.

IMPORTANTE:

No utilizar personajes protegidos, marcas o diseños de terceros sin autorización. Las plantillas y personajes deben provenir de activos licenciados por cada parque o de personajes originales creados para Fotográfica.

La generación debe ejecutarse mediante una función segura del backend. No exponer claves de API en el frontend.

El MVP puede utilizar un proveedor de generación de imágenes mediante API, pero debe implementar una interfaz desacoplada para poder cambiar de proveedor posteriormente.

Considerar:

- Consentimiento explícito para procesar la imagen.

- Protección especial para fotografías de menores.

- Política configurable de conservación.

- Eliminación automática de originales y resultados según plazo.

- Moderación de contenido.

- Marca de agua en las vistas previas.

- Registro de quién generó y aprobó cada imagen.

- Procesamiento en cola.

- Estados: pendiente, procesando, completada, rechazada y error.

4. FACTURACIÓN

Crear dentro del POS un módulo de facturación desacoplado de la venta.

Debe permitir:

- Consumidor final.

- Factura con datos fiscales.

- Selección del tipo de comprobante.

- Datos del cliente.

- País y condición fiscal.

- Impuestos.

- Numeración por punto de venta.

- Estado de emisión.

- Reimpresión.

- Nota de crédito vinculada.

- Descarga en PDF.

- Envío por correo.
CONFIGURACIÓN MULTIPAÍS, MULTIMONEDA Y FISCAL

La plataforma debe diseñarse desde el inicio para operar en múltiples países, incluyendo inicialmente:

- Argentina.

- Brasil.

- Portugal.

- Otros países que puedan incorporarse posteriormente.

No desarrollar reglas fiscales rígidas dentro del código. Crear una arquitectura configurable por país, empresa, sede y punto de venta.

Cada país debe poder configurar:

- Moneda principal.

- Monedas secundarias aceptadas.

- Símbolo y formato monetario.

- Cantidad de decimales.

- Idioma.

- Zona horaria.

- Formato de fecha y hora.

- Tipos y porcentajes de impuestos.

- Categorías fiscales de clientes y productos.

- Tipos de comprobantes.

- Series, prefijos y numeración.

- Datos fiscales obligatorios.

- Reglas de redondeo.

- Retenciones y percepciones.

- Medios de pago habilitados.

- Política de notas de crédito y anulaciones.

- Proveedor o servicio de facturación electrónica.

Configuración inicial:

- Argentina: ARS, español, IVA y adaptador de integración con ARCA.

- Brasil: BRL, portugués, tributos configurables y adaptador fiscal para el proveedor seleccionado.

- Portugal: EUR, portugués, IVA y adaptador para el sistema o proveedor fiscal correspondiente.

- Otros países: configuración genérica extensible sin necesidad de modificar la arquitectura central.

MULTIMONEDA

El sistema debe permitir:

- Definir una moneda funcional por empresa o país.

- Definir una moneda de operación por sede.

- Aceptar pagos en diferentes monedas cuando esté habilitado.

- Registrar el tipo de cambio utilizado en cada transacción.

- Conservar importes en moneda original y moneda funcional.

- Configurar tipos de cambio manuales o mediante una futura API.

- Realizar cierres de caja separados por moneda.

- Mostrar reportes consolidados en una moneda seleccionada.

- No recalcular operaciones históricas si cambia el tipo de cambio.

- Registrar diferencias de cambio.

- Mostrar siempre el código de moneda —ARS, BRL, EUR o USD— cuando pueda existir ambigüedad.

FACTURACIÓN POR PAÍS

Crear una capa fiscal desacoplada mediante adaptadores independientes:

- ArgentinaFiscalAdapter.

- BrazilFiscalAdapter.

- PortugalFiscalAdapter.

- GenericFiscalAdapter.

Cada adaptador debe:

- Validar los datos fiscales requeridos.

- Determinar los comprobantes disponibles.

- Calcular y discriminar impuestos.

- Preparar la solicitud al servicio fiscal correspondiente.

- Consultar el estado del comprobante.

- Procesar autorizaciones y rechazos.

- Generar la representación PDF.

- Gestionar notas de crédito y anulaciones.

- Mantener registros de auditoría.

Para el MVP, estos adaptadores pueden estar simulados, pero la interfaz debe quedar preparada para integrar servicios fiscales reales.

Si una operación se realiza offline:

- La venta se confirma localmente.

- Se conserva el país, moneda, impuestos y configuración fiscal vigentes al momento de la venta.

- El comprobante queda “pendiente de emisión fiscal”.

- Al recuperar la conexión, se envía al adaptador correspondiente.

- Un error fiscal no debe duplicar ni eliminar la venta.

- Los reintentos deben ser idempotentes y auditables.

Cada venta, pago, factura y movimiento financiero debe registrar como mínimo:

- country_code.

- currency_code.

- exchange_rate.

- original_amount.

- functional_currency.

- functional_amount.

- tax_configuration_id.

- fiscal_adapter.

- fiscal_status.

- timezone.

- local_transaction_date.

Los dashboards deben permitir:

- Consultar cada país por separado.

- Comparar países sin mezclar monedas directamente.

- Consolidar resultados en ARS, BRL, EUR, USD u otra moneda seleccionada.

- Visualizar el tipo de cambio utilizado.

- Separar ventas netas, impuestos y ventas brutas.

- Filtrar por empresa, país, sede, evento y moneda.


Para el MVP:

- Simular la integración fiscal mediante un adaptador.

- Preparar interfaces separadas para Argentina y Brasil.

- No afirmar que existe integración fiscal real hasta conectar y certificar los servicios correspondientes.

- En Argentina, preparar el adaptador para ARCA.

- En Brasil, preparar el adaptador para el proveedor fiscal que se seleccione.

Estados del comprobante:

- Pendiente.

- Enviando.

- Autorizado.

- Rechazado.

- Anulado.

Si la venta se realiza offline, debe quedar registrada y la factura debe emitirse cuando exista conexión, mostrando claramente que está “pendiente de emisión fiscal”.

5. INVENTARIO

Crear un módulo básico de inventario con:

- Productos.

- SKU.

- Código de barras.

- Categoría.

- Precio.

- Costo.

- Impuestos.

- Stock por sede.

- Stock por depósito.

- Stock por punto de venta.

- Stock mínimo.

- Movimientos.

- Transferencias.

- Ajustes.

- Recepción de mercadería.

- Productos dañados.

- Productos reservados.

Cada movimiento debe registrar:

- Producto.

- Cantidad.

- Origen.

- Destino.

- Motivo.

- Usuario.

- Fecha local.

- Fecha de sincronización.

- Dispositivo.

- Referencia a venta u operación.

6. ADMINISTRACIÓN Y FINANZAS

Crear un módulo administrativo de alcance inicial que incluya:

CUENTAS POR COBRAR

- Clientes.

- Documentos.

- Vencimientos.

- Saldos.

- Pagos.

- Pagos parciales.

- Estado.

- Antigüedad de deuda.

CUENTAS POR PAGAR

- Proveedores.

- Facturas recibidas.

- Vencimientos.

- Pagos.

- Pagos parciales.

- Centro de costos.

- Estado.

TESORERÍA Y CAJAS

- Apertura de caja.

- Cierre de caja.

- Ingresos.

- Egresos.

- Arqueo.

- Diferencias.

- Rendición por punto de venta.

- Medios de pago.

- Conciliación básica.

Mostrar indicadores de:

- Total por cobrar.

- Total vencido.

- Total por pagar.

- Próximos vencimientos.

- Flujo de caja estimado.

- Diferencias de caja.

- Rendiciones pendientes.

El MVP no debe intentar reemplazar todavía un sistema contable completo. Debe concentrarse en la gestión administrativa y dejar preparada una capa de integración con sistemas contables externos.

7. OPERACIONES

Crear un módulo para planificar y controlar la operación de parques, eventos y puntos de venta.

Entidades principales:

- Clientes corporativos.

- Parques o predios.

- Sedes.

- Eventos.

- Temporadas.

- Puntos de venta.

- Puestos fotográficos.

- Equipos.

- Dispositivos.

- Empleados.

- Turnos.

- Tareas.

- Incidentes.

- Aperturas y cierres operativos.

Cada evento u operación debe poder registrar:

- Cliente.

- País y ciudad.

- Lugar.

- Fecha de inicio y finalización.

- Responsable.

- Puntos de venta activos.

- Puestos fotográficos.

- Personal asignado.

- Equipamiento asignado.

- Productos disponibles.

- Lista de precios.

- Objetivos de venta.

- Horarios.

- Estado operativo.

- Observaciones.

Crear un tablero operativo con columnas:

- Planificado.

- Preparación.

- Listo para abrir.

- En operación.

- Con incidente.

- Cerrado.

CHECKLIST DE APERTURA

- Personal presente.

- Dispositivos funcionando.

- Catálogo actualizado.

- Impresoras disponibles.

- Stock recibido.

- Caja abierta.

- Conectividad comprobada.

- Operación offline preparada.

CHECKLIST DE CIERRE

- Caja cerrada.

- Ventas sincronizadas.

- Fotografías procesadas.

- Stock rendido.

- Incidentes informados.

- Equipos devueltos.

- Reporte diario enviado.

8. USUARIOS, ROLES Y PERMISOS

Crear los siguientes roles iniciales:

- Superadministrador.

- Dirección.

- Administración.

- Responsable de operaciones.

- Encargado de sede.

- Supervisor.

- Cajero/vendedor.

- Fotógrafo.

- Depósito.

- Auditor.

Los permisos deben definirse por:

- Módulo.

- Acción.

- País.

- Empresa.

- Sede.

- Evento.

- Punto de venta.

Implementar auditoría sobre:

- Ventas anuladas.

- Descuentos.

- Cambios de precio.

- Ajustes de stock.

- Aperturas y cierres.

- Pagos.

- Facturas.

- Generaciones de IA.

- Cambios de configuración.

- Sincronizaciones.

9. MODELO DE DATOS EN SUPABASE

Diseñar las tablas principales:

- organizations

- countries

- locations

- venues

- events

- points_of_sale

- devices

- users

- user_roles

- role_permissions

- shifts

- cash_registers

- cash_movements

- customers

- suppliers

- products

- product_categories

- price_lists

- price_list_items

- inventory_locations

- inventory_movements

- photos

- photo_sessions

- ai_templates

- ai_generation_jobs

- ai_generated_images

- customer_consents

- sales

- sale_items

- payments

- invoices

- accounts_receivable

- accounts_payable

- operational_tasks

- operational_checklists

- incidents

- sync_batches

- sync_events

- audit_logs

Todas las tablas operativas deben incluir cuando corresponda:

- id UUID.

- organization_id.

- location_id.

- created_at.

- updated_at.

- created_by.

- device_id.

- local_created_at.

- synced_at.

- sync_status.

- version.

- deleted_at para borrado lógico.

tabla countries:
- currencies

- exchange_rates

- country_fiscal_settings

- tax_types

- tax_rates

- fiscal_document_types

- fiscal_numbering_sequences

- fiscal_integrations

- payment_methods_by_country

Crear migraciones SQL, relaciones, índices y políticas RLS.

10. EXPERIENCIA DE USUARIO Y DISEÑO VISUAL

El diseño debe inspirarse en la identidad visual del sitio:

https://www.fotografica.com/

Analizar y reutilizar de manera coherente:

- Logotipo.

- Paleta cromática.

- Tipografías o equivalentes.

- Estilo fotográfico.

- Uso de espacios.

- Formas y componentes visuales.

La plataforma debe sentirse profesional, visual, moderna y vinculada al mundo de la fotografía y las experiencias.

Lineamientos:

- Dar protagonismo a las imágenes.

- Utilizar fondos neutros y limpios.

- Mantener buen contraste.

- Evitar una estética de ERP antiguo.

- Cards amplias y ordenadas.

- Tablas densas solamente cuando sean necesarias.

- Acciones principales fáciles de encontrar.

- POS optimizado para pantallas táctiles.

- Botones grandes en el flujo de venta.

- Estado offline visible sin resultar invasivo.

- Usar skeleton loaders y estados vacíos bien diseñados.

- Mantener consistencia visual en todos los módulos.

No copiar literalmente el sitio web. Adaptar su identidad a una aplicación operativa.

11. DATOS DE DEMOSTRACIÓN

Cargar datos ficticios inspirados en las operaciones de Fotográfica:

- Sede Argentina.

- Sede Brasil.

- Parque temático.

- Acuario.

- Evento temporal.

- Tres puntos de venta.

- Dos puestos fotográficos.

- Productos de merchandising.

- Fotografías impresas y digitales.

- Usuarios con diferentes roles.

- Ventas online y offline.

- Lotes pendientes de sincronización.

- Cuentas por cobrar y pagar.

- Incidentes operativos.

- Una jornada abierta.

No utilizar datos personales reales.

12. FLUJO PRINCIPAL PARA LA DEMOSTRACIÓN

Implementar completamente este recorrido:

1. El encargado inicia una jornada.

2. El cajero abre la caja.

3. La aplicación pierde conexión y pasa a modo offline.

4. El vendedor busca una fotografía.

5. El cliente selecciona una versión tematizada con IA.

6. La imagen se procesa y se agrega al carrito.

7. El cliente compra la fotografía y un producto de merchandising.

8. La venta se guarda localmente.

9. La factura queda pendiente de emisión.

10. Regresa la conexión.

11. La venta se sincroniza con Supabase.

12. Se actualiza el inventario.

13. Se emite o simula la emisión del comprobante.

14. La operación aparece en el dashboard administrativo.

15. El supervisor cierra y rinde la caja.

13. ENTREGABLES

Entregar:

- Aplicación funcional.

- Diseño responsive.

- PWA instalable.

- Base de datos Supabase.

- Migraciones SQL.

- Políticas RLS.

- Datos de demostración.

- Autenticación y roles.

- POS con simulación offline.

- Cola de sincronización.

- Dashboard.

- Módulos administrativos iniciales.

- Módulo operativo.

- Flujo de generación de imágenes.

- Adaptador fiscal simulado.

- Archivo README con instrucciones.

- Archivo .env.example.

- Diagrama simplificado de arquitectura.

- Explicación de qué es real y qué está simulado.

14. CRITERIOS DE ACEPTACIÓN

El MVP se considera terminado cuando:

- Puede instalarse como PWA.

- Permite iniciar sesión.

- Permite seleccionar una sede.

- El POS funciona sin conexión.

- Una venta offline permanece guardada después de cerrar y reabrir la aplicación.

- Al recuperar conexión, la venta se sincroniza una sola vez.

- El stock se actualiza mediante movimientos trazables.

- Puede asociarse una fotografía a una venta.

- Existe un flujo de generación tematizada con IA, real o claramente simulado.

- La facturación offline queda pendiente hasta recuperar conexión.

- Administración puede consultar la operación sincronizada.

- Operaciones puede abrir y cerrar una jornada.

- Los permisos limitan lo que ve cada rol.

- Todas las operaciones sensibles quedan auditadas.

15. ORDEN DE IMPLEMENTACIÓN

Trabajar por etapas:

ETAPA 1

- Estructura visual.

- Supabase.

- Autenticación.

- Roles.

- Sedes y puntos de venta.

ETAPA 2

- Catálogo.

- POS.

- Caja.

- Ventas.

- Pagos.

ETAPA 3

- PWA.

- IndexedDB.

- Modo offline.

- Cola y sincronización por lotes.

ETAPA 4

- Fotografías.

- Generación con IA.

- Consentimientos.

- Asociación con ventas.

ETAPA 5

- Inventario.

- Administración.

- Operaciones.

- Dashboard.

Antes de desarrollar cada etapa:

1. Explicar brevemente la arquitectura.

2. Indicar las tablas involucradas.

3. Implementar la funcionalidad.

4. Verificar errores.

5. Entregar una lista de pruebas realizadas.

No intentar construir todas las etapas simultáneamente.

Comenzar por la ETAPA 1 y esperar validación antes de continuar.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ftg-connect-magic.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ebe477af-3196-43c0-994e-126e7b2704f9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
