import { useEffect, useState } from 'react';
import { nav, BOOKING_URL } from '../../data/content';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`${styles.nav} ${scrolled || open ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <a href="#top" className={styles.brand} onClick={close} aria-label="Automatiza360, inicio">
          <Logo />
        </a>

        <nav className={styles.links} aria-label="Principal">
          {nav.links.map((l) => (
            <a key={l.href} href={l.href} className={styles.link}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <Button href={BOOKING_URL} size="md" className={styles.cta}>
            {nav.cta}
          </Button>
          <button
            className={styles.toggle}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      <div className={`${styles.mobile} ${open ? styles.mobileOpen : ''}`}>
        <nav className="container">
          {nav.links.map((l) => (
            <a key={l.href} href={l.href} className={styles.mobileLink} onClick={close}>
              {l.label}
            </a>
          ))}
          <Button href={BOOKING_URL} size="lg" icon="arrowRight" onClick={close} className={styles.mobileCta}>
            {nav.cta}
          </Button>
        </nav>
      </div>
    </header>
  );
}
