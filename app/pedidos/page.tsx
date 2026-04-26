'use client'
import { useState, useEffect } from 'react'
import { useCart } from '@/store/cartStore'
import { supabase } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import CartView from '@/components/CartView'
import StickyCartBar from '@/components/StickyCartBar'
import CartToast from '@/components/CartToast'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  category_id: string
  categories: { name: string; is_active: boolean } | null
}

export default function PedidosPage() {
  const [screen, setScreen] = useState<'menu' | 'cart'>('menu')
  const [toast, setToast] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, is_active)')
        .eq('is_active', true)
        .order('order_index')

      if (!error && data) {
        setProducts(data.filter(p => p.categories?.is_active === true))
      }
      setLoading(false)
    }
    fetchProducts()
  }, [])

  function handleAdd(product: Product) {
    addItem({
      id: product.id,
      name: product.name,
      category: product.categories?.name ?? 'Sin categoría',
      price: product.price,
    })
    setToast(product.name)
    setTimeout(() => setToast(null), 2500)
  }

  const byCategory = products.reduce((acc, p) => {
    const cat = p.categories?.name ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  return (
    <main style={{ background: 'var(--color-canvas)', minHeight: '100dvh', paddingBottom: '90px' }}>
      <CartToast productName={toast} />

      {screen === 'menu' && (
        <>
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'var(--color-canvas)',
            borderBottom: '0.5px solid var(--color-border)',
            padding: '1rem 1.25rem',
          }}>
            <p className="text-eyebrow" style={{ marginBottom: '2px' }}>La Mezkla</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Hacé tu pedido
            </h1>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Cargando menú...
            </div>
          ) : (
            Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <p className="text-eyebrow" style={{ padding: '1.25rem 1.25rem 0.5rem' }}>
                  {category}
                </p>
                {items.map(p => (
                  <ProductCard key={p.id} product={p} onAdd={() => handleAdd(p)} />
                ))}
              </div>
            ))
          )}
        </>
      )}

      {screen === 'cart' && (
        <CartView onBack={() => setScreen('menu')} />
      )}

      <StickyCartBar onGoToCart={() => setScreen('cart')} screen={screen} />
    </main>
  )
}