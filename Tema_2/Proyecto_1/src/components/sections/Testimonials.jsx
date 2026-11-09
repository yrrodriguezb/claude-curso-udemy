import { testimonials } from '../../data/content';
import SectionHeader from '../ui/SectionHeader';
import Reveal from '../ui/Reveal';
import Icon from '../ui/Icon';
import styles from './Testimonials.module.css';

const initials = (name) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

export default function Testimonials() {
  return (
    <section className="section" id="testimonios">
      <div className="container">
        <SectionHeader eyebrow={testimonials.eyebrow} title={testimonials.title} />

        <div className={styles.grid}>
          {testimonials.items.map((t, i) => (
            <Reveal as="figure" key={t.name} delay={i * 100} className={`card ${styles.item}`}>
              <div className={styles.top}>
                <div className={styles.stars} aria-label="5 de 5 estrellas">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Icon key={s} name="star" size={16} strokeWidth={0} fill="currentColor" />
                  ))}
                </div>
                <span className={styles.result}>{t.result}</span>
              </div>

              <blockquote className={styles.quote}>“{t.quote}”</blockquote>

              <figcaption className={styles.author}>
                <span className={styles.avatar}>{initials(t.name)}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.role} · {t.company}
                  </span>
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
