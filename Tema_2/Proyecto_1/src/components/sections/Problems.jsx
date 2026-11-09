import { problems, BOOKING_URL } from '../../data/content';
import SectionHeader from '../ui/SectionHeader';
import Reveal from '../ui/Reveal';
import Icon from '../ui/Icon';
import styles from './Problems.module.css';

export default function Problems() {
  return (
    <section className="section" id="problemas">
      <div className="container">
        <SectionHeader eyebrow={problems.eyebrow} title={problems.title} subtitle={problems.subtitle} />

        <div className={styles.grid}>
          {problems.items.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 90} className={`card ${styles.item}`}>
              <span className={styles.icon}>
                <Icon name={p.icon} size={20} />
              </span>
              <h3 className={styles.title}>{p.title}</h3>
              <p className={styles.text}>{p.text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className={styles.bridge}>
          <p>
            La buena noticia: <strong>todo esto se puede automatizar.</strong>
          </p>
          <a href={BOOKING_URL} className={styles.bridgeLink}>
            Descubre por dónde empezar <Icon name="arrowRight" size={16} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
