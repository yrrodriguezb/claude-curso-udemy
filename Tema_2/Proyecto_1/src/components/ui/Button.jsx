import Icon from './Icon';
import styles from './Button.module.css';

/**
 * Botón/enlace reutilizable.
 * variant: 'primary' | 'secondary' | 'ghost'
 * size:    'md' | 'lg'
 */
export default function Button({
  href,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconLeft,
  className = '',
  ...rest
}) {
  const classes = [styles.btn, styles[variant], styles[size], className].join(' ');
  const content = (
    <>
      {iconLeft && <Icon name={iconLeft} size={18} className={styles.iconLeft} />}
      <span>{children}</span>
      {icon && <Icon name={icon} size={18} className={styles.icon} />}
    </>
  );

  return href ? (
    <a href={href} className={classes} {...rest}>
      {content}
    </a>
  ) : (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}
