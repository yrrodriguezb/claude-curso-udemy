import { finalCta, BOOKING_URL } from '../../data/content';
import Reveal from '../ui/Reveal';
import Button from '../ui/Button';
import styles from './FinalCTA.module.css';

export default function FinalCTA() {
  return (
    <section className="section" id="reservar">
      <div className="container">
        <Reveal className={styles.box}>
          <div className={styles.glow} aria-hidden="true" />
          <h2 className={styles.title}>{finalCta.title}</h2>
          <p className={styles.subtitle}>{finalCta.subtitle}</p>
          <Button href={BOOKING_URL} size="lg" icon="arrowRight" className={styles.button}>
            {finalCta.primaryCta}
          </Button>
          <span className={styles.note}>{finalCta.note}</span>
        </Reveal>
      </div>
    </section>
  );
}
