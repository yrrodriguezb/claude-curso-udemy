import { benefits } from '../../data/content';
import SectionHeader from '../ui/SectionHeader';
import Reveal from '../ui/Reveal';
import Icon from '../ui/Icon';
import styles from './Benefits.module.css';

export default function Benefits() {
  return (
    <section className="section section--alt" id="beneficios">
      <div className="container">
        <SectionHeader eyebrow={benefits.eyebrow} title={benefits.title} subtitle={benefits.subtitle} />

        <div className={styles.grid}>
          {benefits.items.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 90} className={`card ${styles.item}`}>
              <div className={styles.top}>
                <span className={styles.icon}>
                  <Icon name={b.icon} size={22} />
                </span>
                <span className={styles.stat}>{b.stat}</span>
              </div>
              <h3 className={styles.title}>{b.title}</h3>
              <p className={styles.text}>{b.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
