import Reveal from './Reveal';
import styles from './SectionHeader.module.css';

/** Encabezado estándar de sección: eyebrow + título + subtítulo. */
export default function SectionHeader({ eyebrow, title, subtitle, align = 'center' }) {
  return (
    <Reveal className={`${styles.header} ${styles[align]}`}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </Reveal>
  );
}
