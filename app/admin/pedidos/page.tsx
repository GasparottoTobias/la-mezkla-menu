'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/AdminSidebar';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
};

type Order = {
  id: string;
  order_code: string | null;
  created_at: string;
  status: string;
  customer_name: string | null;
  notes: string | null;
  delivery_type: string | null;
  payment_method: string | null;
  total: number;
  items: OrderItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Modal de doble confirmación ──────────────────────────────────────────────

type ModalProps = {
  order: Order;
  action: 'confirm' | 'delete';
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

function ConfirmModal({ order, action, onConfirm, onCancel, loading }: ModalProps) {
  const isDelete = action === 'delete';
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem',
    }}>
      <div style={{
        background: '#1a1916',
        border: `0.5px solid ${isDelete ? 'rgba(239,68,68,0.25)' : 'rgba(212,175,55,0.2)'}`,
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '420px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div>
          <p style={{
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: isDelete ? 'rgba(239,68,68,0.7)' : 'var(--color-gold)',
            marginBottom: '0.5rem',
          }}>
            {isDelete ? 'Eliminar pedido' : 'Confirmar pedido'}
          </p>
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.2rem',
            color: 'var(--color-text-primary)',
            marginBottom: '0.4rem',
          }}>
            {isDelete
              ? '¿Eliminar este pedido permanentemente?'
              : `¿Confirmar el pedido de ${order.customer_name ?? 'este cliente'}?`}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {isDelete
              ? 'El pedido se borrará de la base de datos y no podrá recuperarse.'
              : `#${order.order_code ?? order.id.slice(0, 6)} · $${order.total?.toLocaleString('es-AR')}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className={`btn btn-sm ${isDelete ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? (isDelete ? 'Eliminando…' : 'Confirmando…')
              : (isDelete ? 'Sí, eliminar' : 'Sí, confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PedidosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [modal, setModal] = useState<{ order: Order; action: 'confirm' | 'delete' } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Auth ──
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/login'); return; }
      setEmail(data.session.user.email ?? null);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => { loadOrders(); }, []);

  // ── Carga pedidos pendientes con sus items ──
  const loadOrders = async () => {
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('id, order_code, created_at, status, customer_name, notes, delivery_type, payment_method, total')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error || !ordersData) { setOrders([]); return; }

    const orderIds = ordersData.map((o) => o.id);
    if (orderIds.length === 0) { setOrders([]); return; }

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, unit_price, products(name)')
      .in('order_id', orderIds);

    const enriched: Order[] = ordersData.map((o) => ({
      ...o,
      items: (itemsData ?? [])
        .filter((i: any) => i.order_id === o.id)
        .map((i: any) => ({
          id: i.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          product_name: i.products?.name ?? '—',
        })),
    }));

    setOrders(enriched);
  };

  // ── Acción del modal ──
  const handleModalConfirm = async () => {
    if (!modal) return;
    setModalLoading(true);

    if (modal.action === 'confirm') {
      await supabase.from('orders').update({ status: 'confirmed' }).eq('id', modal.order.id);
    } else {
      // Borrar items primero (FK), luego el pedido
      await supabase.from('order_items').delete().eq('order_id', modal.order.id);
      await supabase.from('orders').delete().eq('id', modal.order.id);
    }

    setModalLoading(false);
    setModal(null);
    loadOrders();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0e0d0b',
      }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          color: 'rgba(245,240,232,0.4)',
          fontSize: '1.1rem',
        }}>
          Cargando…
        </p>
      </div>
    );
  }

  return (
    <div className="admin-layout">

      {modal && (
        <ConfirmModal
          order={modal.order}
          action={modal.action}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
          loading={modalLoading}
        />
      )}

      <AdminSidebar email={email} />

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <div className="page-header">
          <div>
            <p className="page-eyebrow">Panel de administración</p>
            <h1 className="page-title">Pedidos pendientes</h1>
          </div>
          <span className="badge badge-gold">{orders.length} pendientes</span>
        </div>

        {orders.length === 0 ? (
          <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              color: 'rgba(245,240,232,0.3)',
              fontSize: '1.1rem',
            }}>
              No hay pedidos pendientes por el momento
            </p>
          </section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((order) => (
              <section key={order.id} className="card">

                {/* ── Cabecera ── */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-gold)',
                        boxShadow: '0 0 6px rgba(212,175,55,0.5)',
                        flexShrink: 0,
                      }} />
                      <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                        {order.customer_name ?? 'Cliente sin nombre'}
                      </p>
                      {order.order_code && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          color: 'var(--color-text-muted)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}>
                          #{order.order_code}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', paddingLeft: '1.1rem' }}>
                      {formatDate(order.created_at)}
                      {order.delivery_type && ` · ${order.delivery_type === 'domicilio' ? '🛵 Domicilio' : '🏠 Local'}`}
                      {order.payment_method && ` · ${order.payment_method}`}
                    </p>
                  </div>
                  <span style={{ color: 'var(--color-gold)', fontWeight: 700, fontSize: '1.05rem', flexShrink: 0 }}>
                    ${order.total?.toLocaleString('es-AR') ?? '—'}
                  </span>
                </div>

                {/* ── Items ── */}
                <div className="table-wrapper" style={{ marginBottom: order.notes ? '1rem' : '1.25rem' }}>
                  <table className="lm-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Precio unit.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                            ${item.unit_price.toLocaleString('es-AR')}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-gold)', fontWeight: 500 }}>
                            ${(item.unit_price * item.quantity).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Notas ── */}
                {order.notes && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    fontStyle: 'italic',
                    marginBottom: '1.25rem',
                    paddingLeft: '0.75rem',
                    borderLeft: '2px solid rgba(212,175,55,0.3)',
                  }}>
                    {order.notes}
                  </p>
                )}

                {/* ── Acciones ── */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setModal({ order, action: 'delete' })}
                  >
                    Descartar pedido
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setModal({ order, action: 'confirm' })}
                  >
                    ✓ Confirmar pedido
                  </button>
                </div>

              </section>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
