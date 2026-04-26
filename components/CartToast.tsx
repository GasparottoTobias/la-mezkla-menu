'use client'
import { useEffect, useState } from 'react'

export default function CartToast({ productName }: { productName: string | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (productName) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [productName])

  return (
    <div className={`fixed top-16 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
    }`}>
      <div style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-glow)',
        padding: '0.7rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        whiteSpace: 'nowrap',
      }}>
        🛒 Se agregó: {productName}
      </div>
    </div>
  )
}