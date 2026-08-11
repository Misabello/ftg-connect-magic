import type { AppRole } from "@/lib/ftg/roles";

export type Language = "es" | "pt";

export const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "es", label: "Español", flag: "ES" },
  { value: "pt", label: "Português", flag: "PT" },
];

type Dict = Record<string, string>;

const es: Dict = {
  "nav.inicio": "Inicio",
  "nav.pos": "Punto de venta",
  "nav.fotografias": "Fotografías",
  "nav.operaciones": "Operaciones",
  "nav.supervisores": "Supervisores (Ex Ges-Pro)",
  "nav.inventario": "Inventario",
  "nav.administracion": "Administración",
  "nav.clientes": "Clientes",
  "nav.reportes": "Reportes",
  "nav.configuracion": "Configuración",
  "nav.sedes": "Sedes",
  "nav.footer": "MVP · Etapa 5 completada",

  "top.menu": "Abrir menú",
  "top.selectLocation": "Seleccionar sede",
  "top.online": "En línea",
  "top.offline": "Sin conexión",
  "top.syncing": "Sincronizando…",
  "top.pendingOne": "pendiente",
  "top.pendingMany": "pendientes",
  "top.lastSync": "Sinc.",
  "top.notifications": "Notificaciones",
  "top.noNotifications": "Sin notificaciones nuevas",
  "top.help": "Ayuda",
  "top.helpSoon": "Centro de ayuda disponible en la próxima etapa",
  "top.language": "Idioma",
  "top.user": "Usuario",
  "top.noRole": "Sin rol asignado",
  "top.signOut": "Cerrar sesión",

  "page.inicio.title": "Buen día",
  "page.inicio.desc": "Estado general de la operación en tiempo real.",
  "page.inicio.noLocation": "Sin sede",
  "page.pos.title": "Punto de venta",
  "page.pos.desc": "Ventas rápidas con funcionamiento offline-first.",
  "page.fotografias.title": "Fotografías",
  "page.fotografias.desc": "Galería, consentimientos y recuerdos con IA",
  "page.operaciones.title": "Operaciones",
  "page.operaciones.desc": "Jornadas por sede: estado, checklists de apertura y cierre, personal e incidentes.",
  "page.inventario.title": "Inventario",
  "page.inventario.desc": "Stock por sede, alertas de mínimo y movimientos trazables.",
  "page.administracion.title": "Administración y finanzas",
  "page.administracion.desc":
    "Cuentas por cobrar y pagar, antigüedad de deuda, tesorería y arqueos por punto de venta.",
  "page.clientes.title": "Clientes",
  "page.clientes.desc":
    "Clientes corporativos (parques y predios) y consumidores finales con datos fiscales, saldos e historial.",
  "page.reportes.title": "Reportes",
  "page.reportes.desc": "Ventas, medios de pago, conversión fotográfica y costos de IA por sede y período.",
  "page.configuracion.title": "Configuración",
  "page.configuracion.desc":
    "Estructura organizativa del MVP: países y monedas, sedes, puntos de venta, usuarios y roles.",
  "page.sedes.title": "Sedes",
  "page.sedes.desc": "Entrá a una sede para administrar sus puntos de venta, cajas y cobros.",

  "config.tab.sedes": "Sedes",
  "config.tab.pos": "Puntos de venta",
  "config.tab.paises": "Países y monedas",
  "config.tab.usuarios": "Usuarios y roles",
  "config.tab.cuenta": "Mi cuenta",
  "config.language.title": "Idioma de la plataforma",
  "config.language.desc":
    "Elegí el idioma con el que se muestra FTG ONE. Se guarda en tu perfil y se aplica en todos tus dispositivos.",

  "role.admin": "Administrador",
  "role.management": "Gerencia",
  "role.executive": "Ejecutivo",
  "role.seller": "Vendedor",
  "role.superadmin": "Superadministrador",
  "role.direccion": "Dirección",
  "role.administracion": "Administración",
  "role.operaciones": "Responsable de operaciones",
  "role.encargado_sede": "Encargado de sede",
  "role.supervisor": "Supervisor",
  "role.cajero": "Cajero / Vendedor",
  "role.fotografo": "Fotógrafo",
  "role.deposito": "Depósito",
  "role.auditor": "Auditor",

  "agent.title": "FTG Copiloto",
  "agent.placeholder": "Preguntá sobre ventas, stock, cajas…",
};

const pt: Dict = {
  "nav.inicio": "Início",
  "nav.pos": "Ponto de venda",
  "nav.fotografias": "Fotografias",
  "nav.operaciones": "Operações",
  "nav.supervisores": "Supervisores",
  "nav.inventario": "Estoque",
  "nav.administracion": "Administração",
  "nav.clientes": "Clientes",
  "nav.reportes": "Relatórios",
  "nav.configuracion": "Configurações",
  "nav.sedes": "Unidades",
  "nav.footer": "MVP · Etapa 5 concluída",

  "top.menu": "Abrir menu",
  "top.selectLocation": "Selecionar unidade",
  "top.online": "Online",
  "top.offline": "Sem conexão",
  "top.syncing": "Sincronizando…",
  "top.pendingOne": "pendente",
  "top.pendingMany": "pendentes",
  "top.lastSync": "Sinc.",
  "top.notifications": "Notificações",
  "top.noNotifications": "Sem notificações novas",
  "top.help": "Ajuda",
  "top.helpSoon": "Central de ajuda disponível na próxima etapa",
  "top.language": "Idioma",
  "top.user": "Usuário",
  "top.noRole": "Sem papel atribuído",
  "top.signOut": "Sair",

  "page.inicio.title": "Bom dia",
  "page.inicio.desc": "Situação geral da operação em tempo real.",
  "page.inicio.noLocation": "Sem unidade",
  "page.pos.title": "Ponto de venda",
  "page.pos.desc": "Vendas rápidas com funcionamento offline-first.",
  "page.fotografias.title": "Fotografias",
  "page.fotografias.desc": "Galeria, consentimentos e lembranças com IA",
  "page.operaciones.title": "Operações",
  "page.operaciones.desc":
    "Jornadas por unidade: status, checklists de abertura e fechamento, equipe e incidentes.",
  "page.inventario.title": "Estoque",
  "page.inventario.desc": "Estoque por unidade, alertas de mínimo e movimentos rastreáveis.",
  "page.administracion.title": "Administração e finanças",
  "page.administracion.desc":
    "Contas a receber e a pagar, aging da dívida, tesouraria e fechamentos por ponto de venda.",
  "page.clientes.title": "Clientes",
  "page.clientes.desc":
    "Clientes corporativos (parques e espaços) e consumidores finais com dados fiscais, saldos e histórico.",
  "page.reportes.title": "Relatórios",
  "page.reportes.desc":
    "Vendas, meios de pagamento, conversão fotográfica e custos de IA por unidade e período.",
  "page.configuracion.title": "Configurações",
  "page.configuracion.desc":
    "Estrutura organizacional do MVP: países e moedas, unidades, pontos de venda, usuários e papéis.",
  "page.sedes.title": "Unidades",
  "page.sedes.desc": "Entre em uma unidade para administrar seus pontos de venda, caixas e recebimentos.",

  "config.tab.sedes": "Unidades",
  "config.tab.pos": "Pontos de venda",
  "config.tab.paises": "Países e moedas",
  "config.tab.usuarios": "Usuários e papéis",
  "config.tab.cuenta": "Minha conta",
  "config.language.title": "Idioma da plataforma",
  "config.language.desc":
    "Escolha o idioma em que o FTG ONE é exibido. Fica salvo no seu perfil e vale em todos os dispositivos.",

  "role.admin": "Administrador",
  "role.management": "Gerência",
  "role.executive": "Executivo",
  "role.seller": "Vendedor",
  "role.superadmin": "Superadministrador",
  "role.direccion": "Diretoria",
  "role.administracion": "Administração",
  "role.operaciones": "Responsável de operações",
  "role.encargado_sede": "Gerente da unidade",
  "role.supervisor": "Supervisor",
  "role.cajero": "Caixa / Vendedor",
  "role.fotografo": "Fotógrafo",
  "role.deposito": "Depósito",
  "role.auditor": "Auditor",

  "agent.title": "FTG Copiloto",
  "agent.placeholder": "Pergunte sobre vendas, estoque, caixas…",
};

const DICTS: Record<Language, Dict> = { es, pt };

export function translate(lang: Language, key: string): string {
  return DICTS[lang][key] ?? DICTS.es[key] ?? key;
}

export function roleLabel(lang: Language, role: AppRole): string {
  return translate(lang, `role.${role}`);
}
