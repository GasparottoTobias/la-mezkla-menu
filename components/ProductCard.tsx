'use client'
import { useCart } from '@/store/cartStore'

interface Props {
  product: {
    id: string
    name: string
    description: string
    price: number
    image_url: string | null
  }
  onAdd: () => void
}

export default function ProductCard({ product, onAdd }: Props) {
  const { items } = useCart()
  const inCart = items.some(i => i.id === product.id)

  return (
    <div className="product-card" style={{ margin: '0 0.75rem 0.6rem' }}>
      {product.image_url && (
        <img src={product.image_url} alt={product.name} className="product-card-image" />
      )}
      <div className="product-card-body">
        <p className="product-card-name">{product.name}</p>
        <p className="product-card-meta">{product.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span className="product-card-price">
            $ {product.price.toLocaleString('es-AR')}
          </span>
          <button
            onClick={onAdd}
            className="btn btn-sm"
            style={inCart ? {
              background: 'var(--color-gold-dim)',
              color: 'var(--color-gold)',
              border: '0.5px solid rgba(197,147,79,0.35)',
              transition: 'all 0.15s',
            } : {
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!inCart) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!inCart) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
              }
            }}
          >
            {inCart ? '✓ Agregado' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}