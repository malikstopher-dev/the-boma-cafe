'use client';

import styles from './MenuCategorySection.module.css';

interface MenuCategorySectionProps {
  id: string;
  name: string;
  description?: string;
  children: React.ReactNode;
}

export default function MenuCategorySection({ id, name, description, children }: MenuCategorySectionProps) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{name}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </section>
  );
}