import { useState } from 'react';
import { faq, BOOKING_URL } from '../../data/content';
import SectionHeader from '../ui/SectionHeader';
import Reveal from '../ui/Reveal';
import Icon from '../ui/Icon';
import styles from './FAQ.module.css';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="section section--alt" id="faq">
      <div className={`container ${styles.layout}`}>
        <div className={styles.aside}>
          <SectionHeader eyebrow={faq.eyebrow} title={faq.title} align="left" />
          <Reveal className={styles.asideText}>
            <p>¿No encuentras tu respuesta?</p>
            <a href={BOOKING_URL}>
              Pregúntanos en la llamada <Icon name="arrowRight" size={16} />
            </a>
          </Reveal>
        </div>

        <Reveal className={styles.list}>
          {faq.items.map((item, i) => {
            const open = openIndex === i;
            const id = `faq-${i}`;
            return (
              <div key={item.q} className={`${styles.item} ${open ? styles.open : ''}`}>
                <h3>
                  <button
                    className={styles.question}
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                  >
                    <span>{item.q}</span>
                    <Icon name="plus" size={20} className={styles.toggle} />
                  </button>
                </h3>
                <div id={id} role="region" className={styles.answer}>
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
