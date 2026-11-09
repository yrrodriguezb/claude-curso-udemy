import Icon from '../ui/Icon';
import styles from './HeroVisual.module.css';

/* Flujo de automatización que se muestra en el panel. Edítalo libremente. */
const FLOW = [
  { icon: 'message', label: 'Nuevo lead por WhatsApp', meta: 'hace 4 s', tone: 'green' },
  { icon: 'sparkles', label: 'IA clasifica: lead caliente', meta: 'Puntuación 92/100', tone: 'violet' },
  { icon: 'database', label: 'Ficha creada en el CRM', meta: 'HubSpot · sincronizado', tone: 'blue' },
  { icon: 'calendar', label: 'Reunión agendada', meta: 'Jue 10:30 · Confirmada', tone: 'cyan' },
];

const BARS = [38, 52, 45, 64, 58, 76, 70, 88, 82, 96];

export default function HeroVisual() {
  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        {/* Cabecera tipo ventana */}
        <div className={styles.header}>
          <div className={styles.dots}>
            <span />
            <span />
            <span />
          </div>
          <span className={styles.headerTitle}>Flujo · Captación y agendado</span>
          <span className={styles.live}>
            <span className={styles.liveDot} /> Activo
          </span>
        </div>

        {/* Pasos del flujo */}
        <ol className={styles.flow}>
          {FLOW.map((step, i) => (
            <li key={step.label} className={styles.step} style={{ animationDelay: `${600 + i * 450}ms` }}>
              <span className={`${styles.stepIcon} ${styles[step.tone]}`}>
                <Icon name={step.icon} size={18} />
              </span>
              <div className={styles.stepText}>
                <strong>{step.label}</strong>
                <span>{step.meta}</span>
              </div>
              <Icon name="check" size={16} strokeWidth={2.4} className={styles.stepCheck} />
            </li>
          ))}
        </ol>

        {/* Mini métricas */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Leads atendidos hoy</span>
            <strong>148</strong>
            <em>+24%</em>
          </div>
          <div className={styles.stat}>
            <span>Tiempo de respuesta</span>
            <strong>38 s</strong>
            <em>-96%</em>
          </div>
          <div className={`${styles.stat} ${styles.chart}`} aria-hidden="true">
            {BARS.map((h, i) => (
              <i key={i} style={{ height: `${h}%`, animationDelay: `${400 + i * 60}ms` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Tarjetas flotantes */}
      <div className={`${styles.float} ${styles.floatTop}`}>
        <span className={`${styles.stepIcon} ${styles.green}`}>
          <Icon name="trendingUp" size={16} />
        </span>
        <div>
          <strong>+32% conversión</strong>
          <span>últimos 30 días</span>
        </div>
      </div>

      <div className={`${styles.float} ${styles.floatBottom}`}>
        <span className={`${styles.stepIcon} ${styles.violet}`}>
          <Icon name="bot" size={16} />
        </span>
        <div>
          <strong>Agente IA</strong>
          <span>“¡Hola, Marta! ¿Te reservo el jueves a las 10:30?”</span>
        </div>
      </div>
    </div>
  );
}
