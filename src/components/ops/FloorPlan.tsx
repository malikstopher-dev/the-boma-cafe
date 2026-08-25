'use client'

import styles from './FloorPlan.module.css'

export interface FloorPlanProps { tableCount?: number; selectedTable?: number | null; onSelect: (table: number) => void }
const POSITIONS = [[18,25],[38,25],[58,25],[78,25],[18,50],[38,50],[58,50],[78,50],[18,75],[38,75],[58,75],[78,75],[28,88],[48,88],[68,88],[88,50]]

export default function FloorPlan({ tableCount = 16, selectedTable = null, onSelect }: FloorPlanProps) {
  return <div className={styles.plan} aria-label="Dining room floor plan">
    <div className={styles.zone} aria-hidden="true" /><span className={styles.zoneLabel}>Main Dining</span>
    {Array.from({ length: tableCount }, (_, index) => { const position = POSITIONS[index % POSITIONS.length]!; const table = index + 1; return <button key={table} type="button" className={`${styles.table} ${selectedTable === table ? styles.selected : ''}`} style={{ left: `${position[0]}%`, top: `${position[1]}%` }} aria-pressed={selectedTable === table} aria-label={`Table ${table}`} onClick={() => onSelect(table)}>{table}</button> })}
  </div>
}
