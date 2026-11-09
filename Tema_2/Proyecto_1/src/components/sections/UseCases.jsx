import { useCases, BOOKING_URL } from '../../data/content';
import SectionHeader from '../ui/SectionHeader';
import Reveal from '../ui/Reveal';
import Icon from '../ui/Icon';
import styles from './UseCases.module.css';

export default function UseCases() {
  return (
    <section className="section section--alt" id="casos">
      <div className="container">
        <SectionHeader eyebrow={useCases.eyebrow} title={useCases.title} subtitle={useCases.subtitle} />

        <div className={styles.grid}>
          {useCases.items.map((u, i) => (
            <Reveal key={u.title} delay={(i % 4) * 70} className={`card ${styles.item}`}>
              <div className={styles.top}>
                <span className={styles.icon}>
                  <Icon name={u.icon} size={20} />
                </span>
                <span className={styles.tag}>{u.tag}</span>
              </div>
              <h3 className={styles.title}>{u.title}</h3>
              <p className={styles.text}>{u.text}</p>
            </Reveal>
          ))}

          {/* Última tarjeta: invitación a un caso a medida */}
          <Reveal delay={210} className={`${styles.item} ${styles.custom}`}>
            <h3 className={styles.title}>¿Tienes un proceso distinto?</h3>
            <p className={styles.text}>Lo analizamos contigo y diseñamos la automatización a medida.</p>
            <a href={BOOKING_URL} className={styles.customLink}>
              Cuéntanos tu caso <Icon name="arrowRight" size={16} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
