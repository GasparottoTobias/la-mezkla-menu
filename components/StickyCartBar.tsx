'use client'
import { useEffect, useState } from 'react'
import { useCart } from '@/store/cartStore'

export default function StickyCartBar({
  onGoToCart, screen
}: {
  onGoToCart: () => void
  screen: 'menu' | 'cart'
}) {
  const { itemCount, total } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const count = itemCount()
  if (count === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '0.75rem',
      background: 'var(--color-canvas)',
      borderTop: '0.5px solid var(--color-border)',
      zIndex: 20,
    }}>
      <button
        onClick={onGoToCart}
        style={{
          width: '100%',
          maxWidth: '32rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '0.9rem 1rem',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.15s, transform 0.1s',
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.background = '#10b981';
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#059669';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🛒</span>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-full)',
            padding: '0.125rem 0.5rem',
            fontSize: '11px',
            fontWeight: 500,
          }}>
            {count}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {screen === 'cart' ? 'Ver resumen' : 'Ir al carrito'}
          </span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>$ {total().toLocaleString('es-AR')}</span>
      </button>
    </div>
  )
}