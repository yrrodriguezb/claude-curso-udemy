import { metrics } from '../../data/content';
import Reveal from '../ui/Reveal';
import styles from './Metrics.module.css';

export default function Metrics() {
  return (
    <section className={styles.metrics} aria-label="Resultados">
      <div className="container">
        <div className={styles.grid}>
          {metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 80} className={styles.item}>
              <strong className={styles.value}>{m.value}</strong>
              <span className={styles.label}>{m.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
