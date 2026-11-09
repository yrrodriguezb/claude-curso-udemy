import { howItWorks, BOOKING_URL } from '../../data/content';
import SectionHeader from '../ui/SectionHeader';
import Reveal from '../ui/Reveal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  return (
    <section className="section" id="como-funciona">
      <div className="container">
        <SectionHeader eyebrow={howItWorks.eyebrow} title={howItWorks.title} subtitle={howItWorks.subtitle} />

        <ol className={styles.steps}>
          {howItWorks.steps.map((s, i) => (
            <Reveal as="li" key={s.number} delay={i * 120} className={styles.step}>
              <span className={styles.number}>{s.number}</span>
              <h3 className={styles.title}>{s.title}</h3>
              <p className={styles.text}>{s.text}</p>
              <span className={styles.detail}>
                <Icon name="check" size={14} strokeWidth={2.4} />
                {s.detail}
              </span>
            </Reveal>
          ))}
        </ol>

        <Reveal className={styles.cta}>
          <Button href={BOOKING_URL} size="lg" icon="arrowRight">
            Empieza por el diagnóstico gratuito
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
