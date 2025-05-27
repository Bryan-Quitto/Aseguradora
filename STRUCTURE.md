# Estructura de Directorios del Proyecto React de la Aseguradora

Este documento describe la estructura de directorios adoptada para el frontend de React de nuestro sistema de gestión de la aseguradora. La organización está diseñada para promover la claridad, la mantenibilidad y la escalabilidad del proyecto, siguiendo un enfoque modular basado en "características" (features) o "dominios" de negocio.

## Filosofía de la Estructura

* **Separación de Preocupaciones:** Cada carpeta tiene un propósito claro y específico.
* **Modularidad por Característica (Feature-Sliced Design):** Las funcionalidades principales (ej. autenticación, pólizas, clientes) se agrupan en módulos independientes (`features/`), conteniendo todo lo necesario para esa funcionalidad.
* **Reusabilidad:** Componentes, hooks y utilidades genéricas se encuentran en carpetas de nivel superior para ser fácilmente accesibles y reutilizables en toda la aplicación.
* **Coherencia:** Fomenta un patrón consistente para el desarrollo de nuevas funcionalidades.

## Estructura de Directorios Detallada

A continuación, se presenta la estructura de directorios de la carpeta `src/`:

src/
├── assets/                     # Archivos estáticos como imágenes, íconos, fuentes, etc.
│   ├── images/                 # Contiene archivos de imagen (logos, ilustraciones, banners, etc.).
│   │   └── logo.svg            # Ejemplo: El logo principal de la aseguradora.
│   ├── icons/                  # Íconos SVG o PNG utilizados en la UI.
│   └── fonts/                  # Archivos de fuentes personalizados importados en la aplicación.
│
├── components/                 # Componentes de Interfaz de Usuario (UI) genéricos y reutilizables globalmente.
│                               # Estos componentes son "dumb" o de presentación; no contienen lógica de negocio
│                               # específica de un módulo y pueden ser usados en cualquier parte de la aplicación.
│   ├── Button.jsx              # Un componente de botón genérico y estilizable.
│   ├── Input.jsx               # Un componente de campo de entrada (input) reutilizable.
│   ├── Modal.jsx               # Un componente para diálogos modales o pop-ups.
│   ├── LoadingSpinner.jsx      # Un indicador visual de carga o spinner.
│   ├── Header.jsx              # El encabezado común de la aplicación (ej. para el dashboard con navegación principal).
│   ├── Sidebar.jsx             # La barra lateral de navegación principal del dashboard.
│   ├── Layout.jsx              # Un componente de layout general que organiza el Header, Sidebar y el área de contenido.
│   └── Table.jsx               # Un componente de tabla reutilizable para mostrar listados de datos.
│
├── contexts/                   # Contextos de React para la gestión de estado global a nivel de aplicación.
│                               # Permiten que los datos compartidos sean accesibles por múltiples componentes
│                               # sin la necesidad de pasar props manualmente a través de la jerarquía.
│   ├── AuthContext.js          # Maneja el estado de autenticación del usuario logueado (sesión, rol, datos del usuario).
│   └── NotificationContext.js  # (Opcional) Contexto para gestionar notificaciones globales (ej. mensajes toast).
│
├── features/                   # Módulos principales de la aplicación.
│                               # Cada subcarpeta aquí representa una "característica" o "dominio" de negocio principal.
│                               # Es el corazón de la aplicación, agrupando todo lo necesario para una funcionalidad completa.
│
│   ├── admin/                  # Funcionalidades exclusivas y avanzadas para el rol de administrador.
│   │                           # Puede incluir reportes detallados, configuración del sistema, gestión de roles/permisos, etc.
│   │   ├── components/         # Componentes UI específicos del módulo de administración.
│   │   ├── pages/              # Páginas completas dentro del módulo de administración.
│   │   │   ├── AdminDashboardPage.jsx # Vista principal/resumen para administradores.
│   │   │   ├── ReportsPage.jsx        # Página para la generación y visualización de reportes.
│   │   │   └── SystemSettingsPage.jsx # Página para configurar parámetros del sistema.
│   │   ├── hooks/              # Hooks personalizados para la lógica de administración.
│   │   ├── services/           # Servicios para interactuar con la API relacionados con la administración.
│   │   └── index.js            # Archivo para exportar convenientemente elementos de este módulo.
│   │
│   ├── agents/                 # Gestión completa del ciclo de vida de los agentes (Crear, Leer, Actualizar, Eliminar).
│   │   ├── components/         # Componentes UI específicos para la gestión de agentes.
│   │   │   ├── AgentForm.jsx   # Formulario para crear o editar agentes.
│   │   │   └── AgentList.jsx   # Listado de agentes.
│   │   ├── pages/              # Páginas de gestión de agentes.
│   │   │   ├── AgentsPage.jsx  # Página principal de listado y gestión de agentes.
│   │   │   └── AgentDetailPage.jsx # Página de detalles de un agente específico.
│   │   ├── hooks/              # Hooks personalizados para la lógica de agentes.
│   │   │   └── useAgents.js    # Hook para manejar el estado y operaciones de los agentes.
│   │   ├── services/           # Servicios para interactuar con la API relacionados con agentes.
│   │   │   └── agentService.js
│   │   └── index.js
│   │
│   ├── auth/                   # Lógica de autenticación y autorización de usuarios.
│   │   ├── components/         # Componentes UI específicos para la autenticación.
│   │   │   ├── LoginForm.jsx   # Formulario de inicio de sesión.
│   │   │   ├── RegisterForm.jsx# Formulario de registro de nuevos usuarios.
│   │   │   └── ForgotPasswordForm.jsx # Formulario para recuperar la contraseña.
│   │   ├── pages/              # Páginas completas relacionadas con la autenticación.
│   │   │   ├── LoginPage.jsx   # La página de inicio de sesión.
│   │   │   ├── RegisterPage.jsx# La página de registro.
│   │   │   └── ResetPasswordPage.jsx # La página para restablecer la contraseña.
│   │   ├── hooks/              # Hooks personalizados para la lógica de autenticación.
│   │   │   └── useAuth.js      # Hook para manejar el estado de autenticación y funciones de login/logout.
│   │   ├── services/           # Servicios para interactuar con la API de autenticación.
│   │   │   └── authService.js
│   │   └── index.js
│   │
│   ├── claims/                 # Gestión de reclamaciones (solicitud, seguimiento del estado, aprobación/rechazo).
│   │   ├── components/         # Componentes UI para las reclamaciones.
│   │   │   ├── ClaimForm.jsx   # Formulario para crear o editar reclamaciones.
│   │   │   ├── ClaimCard.jsx   # Componente para mostrar un resumen de una reclamación.
│   │   │   └── ClaimList.jsx   # Listado de reclamaciones.
│   │   ├── pages/              # Páginas de gestión de reclamaciones.
│   │   │   ├── ClaimsPage.jsx  # Página principal de listado y gestión de reclamaciones.
│   │   │   └── ClaimDetailPage.jsx # Página de detalles de una reclamación específica.
│   │   ├── hooks/              # Hooks para la lógica de reclamaciones.
│   │   │   └── useClaims.js
│   │   ├── services/           # Servicios para interactuar con la API de reclamaciones.
│   │   │   └── claimService.js
│   │   └── index.js
│   │
│   ├── clients/                # Gestión completa del ciclo de vida de los clientes (Crear, Leer, Actualizar, Eliminar).
│   │   ├── components/         # Componentes UI específicos para la gestión de clientes.
│   │   │   ├── ClientForm.jsx  # Formulario para crear o editar clientes.
│   │   │   └── ClientList.jsx  # Listado de clientes.
│   │   ├── pages/              # Páginas de gestión de clientes.
│   │   │   ├── ClientsPage.jsx # Página principal de listado y gestión de clientes.
│   │   │   └── ClientDetailPage.jsx # Página de detalles de un cliente específico.
│   │   ├── hooks/              # Hooks para la lógica de clientes.
│   │   │   └── useClients.js
│   │   ├── services/           # Servicios para interactuar con la API de clientes.
│   │   │   └── clientService.js
│   │   └── index.js
│   │
│   ├── dashboard/              # Vistas generales/resúmenes que los usuarios ven después del login.
│   │                           # Adaptadas para cada rol (administrador, agente, cliente).
│   │   ├── components/         # Componentes específicos para los paneles de control.
│   │   │   ├── AdminDashboardOverview.jsx # Resumen para el administrador.
│   │   │   ├── AgentDashboardOverview.jsx # Resumen para el agente.
│   │   │   └── ClientDashboardOverview.jsx # Resumen para el cliente.
│   │   ├── pages/              # Páginas principales del dashboard para cada rol.
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   ├── AgentDashboardPage.jsx
│   │   │   └── ClientDashboardPage.jsx
│   │   └── index.js
│   │
│   ├── landing/                # Página de inicio/marketing pública de la aseguradora.
│   │                           # No requiere autenticación y es la primera página que ve el usuario.
│   │   ├── components/         # Componentes específicos de la landing page.
│   │   │   ├── HeroSection.jsx # Sección principal con eslogan y llamada a la acción.
│   │   │   ├── FeaturesSection.jsx # Sección que destaca las características/servicios.
│   │   │   └── CallToAction.jsx # Sección de llamada a la acción (ej. botón de login).
│   │   ├── pages/              # Páginas del módulo landing.
│   │   │   └── LandingPage.jsx # La página pública principal de la aseguradora.
│   │   └── index.js
│   │
│   ├── policies/               # Gestión de pólizas (creación, edición, visualización de detalles, búsqueda).
│   │   ├── components/         # Componentes UI específicos para las pólizas.
│   │   │   ├── PolicyForm.jsx  # Formulario para crear o editar pólizas.
│   │   │   ├── PolicyCard.jsx  # Componente para mostrar una póliza individual de forma compacta.
│   │   │   └── PolicyList.jsx  # Listado de pólizas.
│   │   ├── pages/              # Páginas de gestión de pólizas.
│   │   │   ├── PoliciesPage.jsx # Página principal de listado y gestión de pólizas.
│   │   │   ├── PolicyDetailPage.jsx # Página de detalles de una póliza específica.
│   │   │   └── CreatePolicyPage.jsx # Página para crear una nueva póliza.
│   │   ├── hooks/              # Hooks para la lógica de pólizas.
│   │   │   └── usePolicies.js
│   │   ├── services/           # Servicios para interactuar con la API de pólizas.
│   │   │   └── policyService.js
│   │   └── index.js
│   │
│   └── (Otros módulos/features que puedan surgir, ej. reporting, notifications, products, etc.)
│
├── hooks/                      # Hooks personalizados reutilizables globalmente.
│                               # Lógica reutilizable que no está directamente ligada a una característica específica
│                               # y puede ser usada en cualquier módulo.
│   ├── useForm.js              # Hook para manejar el estado y validación de formularios genéricos.
│   ├── useDebounce.js          # Hook para implementar 'debounce' en entradas de usuario (ej. búsqueda).
│   └── useLocalStorage.js      # Hook para interactuar fácilmente con localStorage.
│
├── router/                     # Configuración y lógica de enrutamiento de la aplicación.
│   ├── AppRouter.jsx           # El componente principal que define todas las rutas de la aplicación
│                               # y cómo se enlazan las páginas de los módulos.
│   └── ProtectedRoute.jsx      # Un componente de envoltura para proteger rutas basándose en la autenticación
│                               # y/o el rol del usuario, redirigiendo si no se cumplen las condiciones.
│
├── services/                   # Servicios o utilidades para interactuar con APIs externas (distintas de Supabase).
│                               # Aquí se configuran clientes HTTP y se manejan interceptores globales.
│   ├── api.js                  # Instancia de Axios (o configuración de 'fetch') para el backend principal,
│                               # con interceptores para tokens de autorización, manejo de errores comunes, etc.
│   └── config.js               # Archivo para variables de entorno de la API o configuraciones generales.
│
├── styles/                     # Archivos de estilos CSS/Sass/Less globales y configuración de temas.
│   ├── index.css               # Tu archivo CSS global principal, donde se importan otros estilos o se definen estilos base.
│   ├── variables.css           # Define variables CSS para colores, espaciados, tipografías, etc.
│   └── theme.js                # (Opcional) Si utilizas un sistema de diseño o JS para gestionar tu tema (ej. con Material UI, Chakra UI).
│
├── supabase/                   # Archivos de configuración y cliente de Supabase.
│                               # Esta carpeta es específica para la integración con la base de datos Supabase.
│   └── supabaseClient.js       # El archivo donde se inicializa y exporta el cliente de Supabase para su uso en los servicios.
│
├── utils/                      # Funciones utilitarias generales que no son componentes, hooks ni servicios de API.
│                               # Son funciones puras y de propósito general que pueden ser útiles en toda la aplicación.
│   ├── constants.js            # Define constantes de la aplicación (ej. roles de usuario, tipos de póliza, mensajes de error).
│   ├── validations.js          # Funciones para la validación de datos de formularios (ej. email, contraseñas).
│   ├── formatters.js           # Funciones para formatear datos (ej. fechas, números a moneda, nombres).
│   └── helpers.js              # Funciones auxiliares varias y de propósito general que no encajan en otras categorías.
│
├── App.js                      # El componente raíz de la aplicación. Envuelve el router y los proveedores de contexto (ej. AuthProvider).
├── index.js                    # El punto de entrada principal de la aplicación al DOM (renderiza el componente App).
├── reportWebVitals.js          # (Generado por Create React App) Herramienta para medir el rendimiento de la aplicación.
└── setupTests.js               # (Generado por Create React App) Archivo para configurar el entorno de pruebas (ej. Jest, React Testing Library).
----