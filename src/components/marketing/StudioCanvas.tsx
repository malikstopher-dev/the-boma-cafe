'use client'

import { useEffect, useRef } from 'react'
import { DesignData, DesignElement } from '@/lib/marketing/types'
import { renderDesignToCanvas } from '@/lib/marketing/generators'

interface StudioCanvasProps {
  design: DesignData
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  selectedElementId: string | null
  onSelect: (id: string | null) => void
  onUpdateElement: (id: string, patch: Partial<DesignElement>) => void
  zoom: number
  onZoom: (zoom: number) => void
}

export default function StudioCanvas({
  design,
  canvasRef,
  selectedElementId,
  onSelect,
  onUpdateElement,
  zoom,
  onZoom,
}: StudioCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    renderDesignToCanvas(canvasRef.current, design).catch(err => {
      console.error('Canvas render failed:', err)
    })
  }, [design, canvasRef])

  const handlePointerDown = (element: DesignElement) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(element.id)
    const start = { x: e.clientX, y: e.clientY, elX: element.x, elY: element.y }
    const move = (ev: PointerEvent) => {
      const [dx, dy] = [(ev.clientX - start.x) / zoom, (ev.clientY - start.y) / zoom]
      onUpdateElement(element.id, { x: Math.round(start.elX + dx), y: Math.round(start.elY + dy) })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const handleResizePointerDown = (element: DesignElement) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(element.id)
    const start = { x: e.clientX, y: e.clientY, elW: element.width, elH: element.height }
    const move = (ev: PointerEvent) => {
      const [dx, dy] = [(ev.clientX - start.x) / zoom, (ev.clientY - start.y) / zoom]
      onUpdateElement(element.id, {
        width: Math.max(24, Math.round(start.elW + dx)),
        height: Math.max(24, Math.round(start.elH + dy)),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const sorted = [...design.elements].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div>
      {/* Canvas stage */}
      <div
        ref={stageRef}
        onClick={e => { if (e.target === stageRef.current) onSelect(null) }}
        style={{
          position: 'relative',
          width: design.width * zoom,
          height: design.height * zoom,
          background: '#121212',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={design.width}
          height={design.height}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {sorted.map(el => (
          <div
            key={el.id}
            onPointerDown={handlePointerDown(el)}
            style={{
              position: 'absolute',
              left: el.x * zoom,
              top: el.y * zoom,
              width: el.width * zoom,
              height: el.height * zoom,
              cursor: 'move',
              outline: selectedElementId === el.id ? '2px solid #C8A04E' : '1px dashed rgba(255,255,255,0.25)',
              outlineOffset: 1,
              zIndex: 1000 + el.zIndex,
              boxSizing: 'border-box',
            }}
          />
        ))}

        {selectedElementId && (() => {
          const el = design.elements.find(e => e.id === selectedElementId)
          if (!el) return null
          return (
            <div
              onPointerDown={handleResizePointerDown(el)}
              style={{
                position: 'absolute',
                left: (el.x + el.width) * zoom - 8,
                top: (el.y + el.height) * zoom - 8,
                width: 16,
                height: 16,
                background: '#C8A04E',
                border: '1px solid #F0EBE3',
                borderRadius: 4,
                cursor: 'nwse-resize',
                zIndex: 1100,
              }}
            />
          )
        })()}
      </div>

      {/* Zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={() => onZoom(Math.round(Math.min(1, design.width / 900) * 100) / 100)} title="Fit to screen"
          style={{ padding: '4px 10px', background: '#242018', border: '1px solid #3A3428', borderRadius: 6, color: '#F0EBE3', fontSize: 12, cursor: 'pointer' }}>
          Fit
        </button>
        <button onClick={() => onZoom(Math.max(0.05, zoom - 0.1))} style={{ padding: '4px 10px', background: '#242018', border: '1px solid #3A3428', borderRadius: 6, color: '#F0EBE3', fontSize: 12, cursor: 'pointer' }}>−</button>
        <span style={{ fontSize: 12, color: '#A09888', minWidth: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoom(Math.min(3, zoom + 0.1))} style={{ padding: '4px 10px', background: '#242018', border: '1px solid #3A3428', borderRadius: 6, color: '#F0EBE3', fontSize: 12, cursor: 'pointer' }}>+</button>
        <input
          type="range" min={0.05} max={3} step={0.05} value={zoom}
          onChange={e => onZoom(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  )
}