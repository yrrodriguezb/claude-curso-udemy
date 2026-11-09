/* ==========================================================================
   CONTENIDO DE LA LANDING
   Todo el copy vive aquí. Edita textos, métricas o FAQs sin tocar componentes.
   Los iconos hacen referencia a los nombres definidos en components/ui/Icon.jsx
   ========================================================================== */

// Cambia este enlace por tu Calendly, Cal.com, HubSpot Meetings, etc.
export const BOOKING_URL = '#reservar';

export const nav = {
  links: [
    { label: 'Beneficios', href: '#beneficios' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Casos de uso', href: '#casos' },
    { label: 'Testimonios', href: '#testimonios' },
    { label: 'FAQ', href: '#faq' },
  ],
  cta: 'Reserva una llamada',
};

export const hero = {
  badge: 'Diagnóstico de automatización gratuito · Plazas limitadas este mes',
  titleStart: 'Tu negocio vende más',
  titleHighlight: 'cuando el trabajo repetitivo',
  titleEnd: 'se hace solo.',
  subtitle:
    'Implementamos automatizaciones y agentes de IA que responden a tus clientes, hacen seguimiento a cada lead y conectan tus herramientas. Más ventas y menos horas operativas, sin ampliar tu equipo.',
  primaryCta: 'Reserva una llamada',
  secondaryCta: 'Ver cómo funciona',
  trust: ['Sin compromiso', 'Llamada de 30 min', 'Plan de acción concreto'],
  integrations: ['WhatsApp', 'Gmail', 'HubSpot', 'Google Calendar', 'Notion', 'Stripe', 'Airtable', 'Slack'],
};

export const metrics = [
  { value: '+120', label: 'negocios automatizados' },
  { value: '18 h', label: 'ahorradas por persona cada semana' },
  { value: '< 2 min', label: 'tiempo medio de respuesta a leads' },
  { value: '+32%', label: 'de aumento medio en conversión' },
];

export const problems = {
  eyebrow: 'El problema',
  title: '¿Te suena alguna de estas situaciones?',
  subtitle: 'Son los cuellos de botella que más ventas cuestan a las pymes, y casi siempre tienen solución.',
  items: [
    {
      icon: 'clock',
      title: 'Respondes tarde y el lead se enfría',
      text: 'Un contacto que espera horas una respuesta ya está hablando con tu competencia.',
    },
    {
      icon: 'repeat',
      title: 'Tu equipo copia y pega datos todo el día',
      text: 'Del formulario al Excel, del Excel al CRM, del CRM al email. Horas que no generan valor.',
    },
    {
      icon: 'inbox',
      title: 'Nadie hace seguimiento a tiempo',
      text: 'Presupuestos enviados que nadie retoma y oportunidades que se pierden en el olvido.',
    },
    {
      icon: 'puzzle',
      title: 'Tus herramientas no se hablan entre sí',
      text: 'WhatsApp, email, CRM y calendario funcionan como islas y la información se pierde.',
    },
    {
      icon: 'users',
      title: 'Crecer implica contratar más personas',
      text: 'Cada nuevo cliente añade carga operativa en lugar de rentabilidad.',
    },
    {
      icon: 'eyeOff',
      title: 'No sabes qué está pasando en tu embudo',
      text: 'Sin datos fiables es imposible saber dónde se escapan las ventas.',
    },
  ],
};

export const benefits = {
  eyebrow: 'Beneficios',
  title: 'Un negocio que funciona mejor, incluso cuando no estás',
  subtitle: 'Diseñamos sistemas que trabajan 24/7 para que tu equipo se dedique a lo que realmente vende.',
  items: [
    {
      icon: 'zap',
      title: 'Respuesta inmediata a cada cliente',
      text: 'Agentes de IA que atienden por WhatsApp y email al instante, con el tono de tu marca.',
      stat: '24/7',
    },
    {
      icon: 'trendingUp',
      title: 'Seguimiento comercial sin olvidos',
      text: 'Secuencias automáticas que retoman cada oportunidad en el momento justo.',
      stat: '+32%',
    },
    {
      icon: 'timer',
      title: 'Menos tareas manuales',
      text: 'Eliminamos el copiar y pegar, los recordatorios a mano y los informes eternos.',
      stat: '-70%',
    },
    {
      icon: 'link',
      title: 'Herramientas conectadas',
      text: 'CRM, formularios, calendario y bases de datos sincronizados en tiempo real.',
      stat: '1 fuente',
    },
    {
      icon: 'target',
      title: 'Captación, ventas y soporte en piloto automático',
      text: 'Del primer clic a la venta cerrada, con cada paso registrado y medido.',
      stat: '360°',
    },
    {
      icon: 'shield',
      title: 'Crece sin ampliar plantilla',
      text: 'Atiende el doble de clientes con el mismo equipo y la misma calidad.',
      stat: '2x',
    },
  ],
};

export const howItWorks = {
  eyebrow: 'Cómo funciona',
  title: 'De procesos manuales a un sistema que escala, en 3 pasos',
  subtitle: 'Un método claro, sin jerga técnica y con resultados visibles desde las primeras semanas.',
  steps: [
    {
      number: '01',
      title: 'Diagnóstico gratuito',
      text: 'Analizamos tus procesos en una llamada estratégica y detectamos cuellos de botella, tareas repetitivas y oportunidades con IA.',
      detail: '30 minutos · Sin compromiso',
    },
    {
      number: '02',
      title: 'Diseño e implementación',
      text: 'Construimos las automatizaciones y agentes de IA conectados a tus herramientas actuales. Tú no tienes que tocar una línea de código.',
      detail: 'Primeros resultados en 2–4 semanas',
    },
    {
      number: '03',
      title: 'Optimización continua',
      text: 'Medimos el impacto, ajustamos y escalamos lo que funciona para que el sistema rinda cada vez más.',
      detail: 'Informes claros cada mes',
    },
  ],
};

export const useCases = {
  eyebrow: 'Casos de uso',
  title: 'Lo que podemos automatizar en tu negocio',
  subtitle: 'Soluciones probadas que adaptamos a tu forma de trabajar.',
  items: [
    { icon: 'magnet', title: 'Captación automática de leads', text: 'Formularios, anuncios y redes que alimentan tu CRM sin intervención manual.', tag: 'Captación' },
    { icon: 'message', title: 'Seguimiento por email o WhatsApp', text: 'Mensajes personalizados que se envían solos según el comportamiento del lead.', tag: 'Ventas' },
    { icon: 'calendar', title: 'Agendado automático de reuniones', text: 'El cliente reserva, recibe confirmación y recordatorios. Tú solo te presentas.', tag: 'Ventas' },
    { icon: 'sparkles', title: 'Clasificación de leads con IA', text: 'La IA puntúa y prioriza cada contacto para que tu equipo hable primero con los mejores.', tag: 'IA' },
    { icon: 'headset', title: 'Atención al cliente automatizada', text: 'Un agente que resuelve dudas frecuentes y escala a una persona cuando hace falta.', tag: 'Soporte' },
    { icon: 'fileText', title: 'Presupuestos y recordatorios', text: 'Genera propuestas, envíalas y haz seguimiento de pagos sin perseguir a nadie.', tag: 'Operaciones' },
    { icon: 'refresh', title: 'Sincronización entre CRM y herramientas', text: 'Un único dato correcto, actualizado en todas tus plataformas a la vez.', tag: 'Integración' },
  ],
};

export const testimonials = {
  eyebrow: 'Testimonios',
  title: 'Negocios que ya trabajan de otra forma',
  items: [
    {
      quote:
        'Antes tardábamos medio día en responder a los leads de Instagram. Ahora el agente contesta en segundos y agenda la llamada. Hemos cerrado un 40% más de ventas en tres meses.',
      name: 'Laura Méndez',
      role: 'Fundadora',
      company: 'Estudio Lumen',
      result: '+40% ventas',
    },
    {
      quote:
        'Nos liberaron unas 20 horas semanales de tareas administrativas. El equipo por fin se dedica a los clientes y no a pasar datos de una hoja a otra.',
      name: 'Carlos Ortega',
      role: 'Director de operaciones',
      company: 'Grupo Nexa',
      result: '20 h/semana',
    },
    {
      quote:
        'Lo que más valoro es la claridad: entendimos qué automatizar primero y por qué. En pocas semanas teníamos el seguimiento comercial funcionando solo.',
      name: 'Andrea Ríos',
      role: 'CEO',
      company: 'Academia Impulsa',
      result: '3x seguimiento',
    },
  ],
};

export const faq = {
  eyebrow: 'Preguntas frecuentes',
  title: 'Resolvemos tus dudas',
  items: [
    {
      q: '¿Necesito conocimientos técnicos para trabajar con ustedes?',
      a: 'No. Nos encargamos de todo el diseño, la implementación y el mantenimiento. Tú solo nos cuentas cómo funciona tu negocio y validas los resultados.',
    },
    {
      q: '¿Qué incluye exactamente el diagnóstico gratuito?',
      a: 'Una llamada estratégica de unos 30 minutos en la que revisamos tus procesos de captación, ventas y soporte. Sales con una lista priorizada de oportunidades de automatización y una estimación de impacto.',
    },
    {
      q: '¿Funciona con las herramientas que ya uso?',
      a: 'En la gran mayoría de casos, sí. Trabajamos con WhatsApp, Gmail, Outlook, HubSpot, Pipedrive, Google Calendar, Notion, Airtable, Stripe y cientos de herramientas más.',
    },
    {
      q: '¿Cuánto tiempo tarda en estar funcionando?',
      a: 'Las primeras automatizaciones suelen estar operativas en 2 a 4 semanas, según el alcance. Empezamos por lo que más impacto genera para que veas resultados pronto.',
    },
    {
      q: '¿La IA va a responder a mis clientes de forma impersonal?',
      a: 'No. Entrenamos los agentes con tu información, tu tono y tus criterios. Además, definimos cuándo debe intervenir una persona del equipo.',
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Sí. Usamos plataformas con estándares de seguridad reconocidos, aplicamos el principio de mínimo acceso y cumplimos con la normativa de protección de datos.',
    },
  ],
};

export const finalCta = {
  title: 'Descubre cuántas horas y ventas estás dejando sobre la mesa',
  subtitle:
    'Reserva tu diagnóstico gratuito y sal de la llamada con un plan claro de qué automatizar primero y qué impacto esperar.',
  primaryCta: 'Reserva una llamada',
  note: 'Gratis · 30 minutos · Sin compromiso',
};

export const footer = {
  tagline: 'Automatizaciones e inteligencia artificial para negocios que quieren crecer sin complicarse.',
  columns: [
    {
      title: 'Soluciones',
      links: [
        { label: 'Captación de leads', href: '#casos' },
        { label: 'Seguimiento comercial', href: '#casos' },
        { label: 'Atención al cliente', href: '#casos' },
        { label: 'Integraciones', href: '#casos' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { label: 'Cómo funciona', href: '#como-funciona' },
        { label: 'Testimonios', href: '#testimonios' },
        { label: 'Preguntas frecuentes', href: '#faq' },
        { label: 'Contacto', href: 'mailto:hola@automatiza360.com' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Aviso legal', href: '#' },
        { label: 'Privacidad', href: '#' },
        { label: 'Cookies', href: '#' },
      ],
    },
  ],
  email: 'hola@automatiza360.com',
  copyright: `© ${new Date().getFullYear()} Automatiza360. Todos los derechos reservados.`,
};
