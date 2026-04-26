'use client'
import { useState } from 'react'
import { useCart } from '@/store/cartStore'

const WA_NUMBER = '543564660528' // ← cambiá por el número real

export default function CartView({ onBack }: { onBack: () => void }) {
  const { items, updateQty, removeItem, total } = useCart()
  const [name, setName]         = useState('')
  const [notes, setNotes]       = useState('')
  const [delivery, setDelivery] = useState<'domicilio' | 'local'>('domicilio')
  const [payment, setPayment]   = useState('Efectivo')
  const [loading, setLoading]   = useState(false)

  const orderTotal = total()

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.7rem 1rem',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    resize: 'none' as const,
    transition: 'border-color 0.2s, background 0.2s',
  }

  const sectionStyle: React.CSSProperties = {
    margin: '0 0.75rem 0.6rem',
    background: 'var(--color-surface)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.25rem',
    boxShadow: 'var(--shadow-card)',
  }

  function RadioOpt({
    label, value, group, current, onChange,
  }: {
    label: string; value: string; group: string
    current: string; onChange: (v: string) => void
  }) {
    const selected = current === value
    return (
      <label style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
        border: `0.5px solid ${selected ? 'rgba(197,147,79,0.4)' : 'rgba(255,255,255,0.07)'}`,
        background: selected ? 'var(--color-gold-dim)' : 'transparent',
        transition: 'all 0.15s',
      }}>
        <input
          type="radio" name={group} value={value} checked={selected}
          onChange={() => onChange(value)}
          style={{ accentColor: 'var(--color-gold)', flexShrink: 0 }}
        />
        <span style={{
          fontSize: '13px',
          color: selected ? 'var(--color-gold)' : 'var(--color-text-secondary)',
        }}>
          {label}
        </span>
      </label>
    )
  }

  async function handleWhatsApp() {
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name || 'Sin nombre',
          notes,
          deliveryType: delivery,
          paymentMethod: payment,
          items: items.map(i => ({
            productId: i.id,
            name: i.name,
            category: i.category,
            price: i.price,
            qty: i.quantity,
          })),
        }),
      })
      const { orderCode } = await res.json()

      const lines = [
        `Nuevo pedido #${orderCode}`,
        '------- CLIENTE -------',
        `Nombre: ${name || 'Sin nombre'}`,
        `Medio de Pago: ${payment}`,
        `Envío: ${delivery === 'domicilio' ? 'Envío a domicilio' : 'Retira en local'}`,
        notes ? `Observaciones: ${notes}` : '',
        '------- PEDIDO -------',
        ...items.map(i =>
          `${i.quantity} x ${i.category}: ${i.name} = $ ${(i.price * i.quantity).toLocaleString('es-AR')}`
        ),
        '..................',
        `TOTAL: $ ${orderTotal.toLocaleString('es-AR')}`,
      ].filter(Boolean).join('\n')

      window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines)}`, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-canvas)', minHeight: '100dvh' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-canvas)',
        borderBottom: '0.5px solid var(--color-border)',
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-gold)', fontSize: '24px', padding: '2px 10px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem', fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          Tu carrito
        </h1>
      </div>

      {items.length === 0 ? (
        <p style={{
          textAlign: 'center', color: 'var(--color-text-muted)',
          padding: '4rem 1rem', fontSize: '13px',
        }}>
          Tu carrito está vacío
        </p>
      ) : (
        <>
          {/* Items */}
          {items.map(item => (
            <div key={item.id} style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {item.category}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-danger-text)', fontSize: '13px', padding: '2px 6px',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    style={{
                      width: '32px', height: '32px', fontSize: '16px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >−</button>
                  <span style={{
                    width: '28px', textAlign: 'center',
                    fontSize: '14px', fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    borderLeft: '0.5px solid var(--color-border)',
                    borderRight: '0.5px solid var(--color-border)',
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    style={{
                      width: '32px', height: '32px', fontSize: '16px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >+</button>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gold)' }}>
                  $ {(item.price * item.quantity).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          ))}

          {/* Datos del cliente */}
          <div style={sectionStyle}>
            <p style={{
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)', marginBottom: '10px',
            }}>
              Tus datos
            </p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre"
              style={inputStyle}
            />
          </div>

          {/* Observaciones */}
          <div style={sectionStyle}>
            <p style={{
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)', marginBottom: '4px',
            }}>
              Aclaraciones / Observaciones
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
              Horario de envío o retiro, dirección, preferencias (ej: sin lechuga)…
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Entregar después de las 19 hs, sin cebolla..."
              rows={3}
              style={inputStyle}
            />
          </div>

          {/* Envío */}
          <div style={sectionStyle}>
            <p style={{
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)', marginBottom: '10px',
            }}>
              Tipo de envío
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <RadioOpt label="Envío a domicilio" value="domicilio" group="delivery"
                current={delivery} onChange={v => setDelivery(v as 'domicilio' | 'local')} />
              <RadioOpt label="Retira en local" value="local" group="delivery"
                current={delivery} onChange={v => setDelivery(v as 'domicilio' | 'local')} />
            </div>
          </div>

          {/* Pago */}
          <div style={sectionStyle}>
            <p style={{
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)', marginBottom: '10px',
            }}>
              Medio de pago
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <RadioOpt label="Efectivo" value="Efectivo" group="payment"
                current={payment} onChange={setPayment} />
              <RadioOpt label="Transferencia" value="Transferencia" group="payment"
                current={payment} onChange={setPayment} />
            </div>
          </div>

          {/* Total */}
          <div style={sectionStyle}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '15px', fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-gold)' }}>
                $ {orderTotal.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          {/* Botón WhatsApp */}
          <div style={{ padding: '0 0.75rem 1.5rem' }}>
            <button
              onClick={handleWhatsApp}
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'rgba(16,185,129,0.4)' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                fontSize: '15px',
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                }
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#10b981';
                }
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#059669';
                }
              }}
            >
              📲 {loading ? 'Guardando...' : 'Pedir por WhatsApp'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}