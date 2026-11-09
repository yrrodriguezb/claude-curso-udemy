import { hero, BOOKING_URL } from '../../data/content';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import HeroVisual from './HeroVisual';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section id="top" className={styles.hero}>
      {/* Fondo decorativo: rejilla + halos de color */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.grid} />
        <div className={`${styles.glow} ${styles.glowA}`} />
        <div className={`${styles.glow} ${styles.glowB}`} />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <a href={BOOKING_URL} className={styles.badge}>
            <span className={styles.badgeDot} />
            {hero.badge}
          </a>

          <h1 className={styles.title}>
            {hero.titleStart}{' '}
            <span className="text-gradient">{hero.titleHighlight}</span> {hero.titleEnd}
          </h1>

          <p className={styles.subtitle}>{hero.subtitle}</p>

          <div className={styles.ctas}>
            <Button href={BOOKING_URL} size="lg" icon="arrowRight">
              {hero.primaryCta}
            </Button>
            <Button href="#como-funciona" size="lg" variant="secondary" iconLeft="play">
              {hero.secondaryCta}
            </Button>
          </div>

          <ul className={styles.trust}>
            {hero.trust.map((t) => (
              <li key={t}>
                <Icon name="check" size={16} strokeWidth={2.4} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.visual}>
          <HeroVisual />
        </div>
      </div>

      {/* Franja de integraciones */}
      <div className={`container ${styles.integrations}`}>
        <p>Conectamos las herramientas que ya usas</p>
        <ul>
          {hero.integrations.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
