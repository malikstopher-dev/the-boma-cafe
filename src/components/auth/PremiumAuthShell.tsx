import type { ReactNode } from 'react'
import styles from './PremiumAuthShell.module.css'

interface PremiumAuthShellProps { eyebrow:string; title:string; subtitle:string; children:ReactNode; footer?:ReactNode }
export default function PremiumAuthShell({eyebrow,title,subtitle,children,footer}:PremiumAuthShellProps){return <main className={styles.shell}><div className={styles.frame}><section className={styles.brand} aria-label="Boma Cafe"><div><p className={styles.eyebrow}>{eyebrow}</p><h1 className={styles.title}>{title}</h1><p className={styles.subtitle}>{subtitle}</p></div><div className={styles.signal}><span className={styles.signalDot} aria-hidden="true"/>Live operations platform</div></section><section className={styles.panel}>{children}{footer}</section></div></main>}
