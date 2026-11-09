import { footer, BOOKING_URL } from '../../data/content';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.top}`}>
        <div className={styles.brand}>
          <Logo />
          <p>{footer.tagline}</p>
          <a href={`mailto:${footer.email}`} className={styles.email}>
            <Icon name="mail" size={16} />
            {footer.email}
          </a>
        </div>

        {footer.columns.map((col) => (
          <div key={col.title} className={styles.col}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>{footer.copyright}</span>
        <a href={BOOKING_URL} className={styles.bottomCta}>
          Reserva tu diagnóstico gratuito <Icon name="arrowRight" size={14} />
        </a>
      </div>
    </footer>
  );
}
