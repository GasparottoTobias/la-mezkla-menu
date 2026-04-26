'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/AdminSidebar';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  order_code: string;
  customer_name: string;
  total: number;
  subtotal: number;
  delivery_cost: number;
  delivery_type: string;
  payment_method: string;
  status: string;
  created_at: string;
  notes: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type KPI = { label: string; value: string; sub: string; icon: string; color: string; };
type Range = '7d' | '30d' | '90d' | 'all';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};
const DAY_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
  ready: '#10b981', delivered: '#22c55e',
  pendiente: '#f59e0b', confirmado: '#3b82f6', preparando: '#8b5cf6',
  listo: '#10b981', entregado: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  ready: 'Listo', delivered: 'Entregado',
  pendiente: 'Pendiente', confirmado: 'Confirmado', preparando: 'Preparando',
  listo: 'Listo', entregado: 'Entregado',
};

const toStatusLabel = (s: string) => STATUS_LABELS[s] ?? s;

function getFromDate(range: Range): string | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === '7d' ? 7 : range === '30d' ? 30 : 90));
  return d.toISOString();
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid rgba(245,240,232,0.1)',
        borderTopColor: 'rgba(245,240,232,0.7)',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div style={{
      background: 'rgba(245,240,232,0.04)', border: '0.5px solid rgba(245,240,232,0.09)',
      borderRadius: 14, padding: '1.25rem 1.5rem',
      display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -16, right: -16, fontSize: 72, opacity: 0.06, lineHeight: 1, userSelect: 'none' }}>
        {kpi.icon}
      </div>
      <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {kpi.label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: kpi.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {kpi.value}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)' }}>{kpi.sub}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', marginTop: '0.5rem',
    }}>
      <div style={{ height: 1, flex: 1, background: 'rgba(245,240,232,0.06)' }} />
      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ height: 1, flex: 1, background: 'rgba(245,240,232,0.06)' }} />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // para drill-down por día

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

  const load = useCallback(async () => {
    setDataLoading(true);
    const from = getFromDate(range);
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (from) q = q.gte('created_at', from);
    const { data: ordersData } = await q;

    const orderIds = (ordersData ?? []).map((o: Order) => o.id);
    let itemsData: OrderItem[] = [];
    if (orderIds.length > 0) {
      const { data } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      itemsData = data ?? [];
    }
    setOrders(ordersData ?? []);
    setItems(itemsData);
    setLastUpdated(new Date());
    setDataLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0d0b' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'rgba(245,240,232,0.4)', fontSize: '1.1rem' }}>
          Cargando…
        </p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CÁLCULOS ANALÍTICOS
  // ══════════════════════════════════════════════════════════════════════════

  const activeOrders = orders;
  const totalRevenue = activeOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalOrders = activeOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const todayStr = new Date().toDateString();
  const todayOrders = activeOrders.filter(o => new Date(o.created_at).toDateString() === todayStr);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total ?? 0), 0);

  // ── KPIs ──
  const kpis: KPI[] = [
    { label: 'Ventas del período', value: fmtShort(totalRevenue), sub: `${totalOrders} pedidos`, icon: '💰', color: 'rgba(245,240,232,0.95)' },
    { label: 'Hoy', value: fmtShort(todayRevenue), sub: `${todayOrders.length} pedidos hoy`, icon: '📅', color: '#86efac' },
    { label: 'Ticket promedio', value: fmtShort(avgTicket), sub: 'por pedido', icon: '🎯', color: '#93c5fd' },
    { label: 'Pendientes', value: String(orders.filter(o => o.status === 'pending' || o.status === 'pendiente').length), sub: 'esperando confirmación', icon: '⏳', color: '#fde68a' },
  ];

  // ── Ventas por día de semana (acumulado) ──
  const byDay: Record<number, { total: number; orders: number; items: { name: string; qty: number; category: string }[] }> = {};
  for (let i = 0; i < 7; i++) byDay[i] = { total: 0, orders: 0, items: [] };

  activeOrders.forEach(o => {
    const d = new Date(o.created_at).getDay();
    byDay[d].total += o.total ?? 0;
    byDay[d].orders += 1;
  });

  // Items por día de semana
  items.forEach(it => {
    const order = activeOrders.find(o => o.id === it.order_id);
    if (!order) return;
    const d = new Date(order.created_at).getDay();
    const existing = byDay[d].items.find(x => x.name === it.product_name);
    if (existing) { existing.qty += it.quantity; }
    else { byDay[d].items.push({ name: it.product_name, qty: it.quantity, category: it.category_name }); }
  });

  const dayData = [1, 2, 3, 4, 5, 6, 0].map(i => ({
    day: i,
    label: DAY_SHORT[i],
    fullLabel: DAY_LABELS[i],
    total: byDay[i].total,
    orders: byDay[i].orders,
    topItem: byDay[i].items.sort((a, b) => b.qty - a.qty)[0] ?? null,
    allItems: byDay[i].items.sort((a, b) => b.qty - a.qty).slice(0, 5),
  }));

  const maxDayTotal = Math.max(...dayData.map(d => d.total), 1);
  const maxDayOrders = Math.max(...dayData.map(d => d.orders), 1);

  // Día más activo
  const busiestDay = dayData.reduce((a, b) => b.orders > a.orders ? b : a, dayData[0]);

  // ── Pico de horarios ──
  // Agrupamos por hora del día
  const byHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  activeOrders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    byHour[h] += 1;
  });
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: byHour[h] }));
  const maxHourOrders = Math.max(...hourData.map(h => h.orders), 1);
  const peakHour = hourData.reduce((a, b) => b.orders > a.orders ? b : a, hourData[0]);

  // Pico por día de semana + hora (heatmap data: 7 días x 24 horas)
  const heatmap: Record<string, number> = {};
  activeOrders.forEach(o => {
    const d = new Date(o.created_at).getDay();
    const h = new Date(o.created_at).getHours();
    const key = `${d}-${h}`;
    heatmap[key] = (heatmap[key] ?? 0) + 1;
  });
  const maxHeatmap = Math.max(...Object.values(heatmap), 1);

  // ── Top productos global ──
  const productMap: Record<string, { name: string; category: string; qty: number; revenue: number; orders: number }> = {};
  items.forEach(it => {
    if (!productMap[it.product_name]) {
      productMap[it.product_name] = { name: it.product_name, category: it.category_name, qty: 0, revenue: 0, orders: 0 };
    }
    productMap[it.product_name].qty += it.quantity;
    productMap[it.product_name].revenue += it.subtotal ?? 0;
    productMap[it.product_name].orders += 1;
  });
  const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQty = Math.max(...topProducts.map(p => p.qty), 1);

  // ── Análisis por categoría ──
  const categoryMap: Record<string, { qty: number; revenue: number; orders: number; products: Record<string, number> }> = {};
  items.forEach(it => {
    const cat = it.category_name ?? 'Sin categoría';
    if (!categoryMap[cat]) categoryMap[cat] = { qty: 0, revenue: 0, orders: 0, products: {} };
    categoryMap[cat].qty += it.quantity;
    categoryMap[cat].revenue += it.subtotal ?? 0;
    categoryMap[cat].orders += 1;
    categoryMap[cat].products[it.product_name] = (categoryMap[cat].products[it.product_name] ?? 0) + it.quantity;
  });

  const categoryData = Object.entries(categoryMap)
    .map(([name, d]) => ({
      name,
      qty: d.qty,
      revenue: d.revenue,
      orders: d.orders,
      topProduct: Object.entries(d.products).sort((a, b) => b[1] - a[1])[0] ?? null,
      allProducts: Object.entries(d.products).sort((a, b) => b[1] - a[1]).slice(0, 3),
    }))
    .sort((a, b) => b.qty - a.qty);

  const maxCatQty = Math.max(...categoryData.map(c => c.qty), 1);

  // ── Producto top por categoría ──
  // Ya disponible en categoryData[x].topProduct

  // ── Estado de pedidos ──
  const statusMap: Record<string, number> = {};
  orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] ?? 0) + 1; });
  const statusData = Object.entries(statusMap)
    .map(([s, c]) => ({ status: s, count: c, color: STATUS_COLORS[s] ?? '#888' }))
    .sort((a, b) => b.count - a.count);

  // ── Métodos de pago ──
  const payMap: Record<string, number> = {};
  activeOrders.forEach(o => {
    const m = o.payment_method ?? 'Sin especificar';
    payMap[m] = (payMap[m] ?? 0) + 1;
  });
  const payData = Object.entries(payMap)
    .map(([m, c]) => ({ method: m, count: c, pct: Math.round((c / Math.max(totalOrders, 1)) * 100) }))
    .sort((a, b) => b.count - a.count);

  // ── Delivery vs Retiro ──
  const deliveryCount = activeOrders.filter(o => {
    const t = (o.delivery_type ?? '').toLowerCase().trim();
    return t !== 'local' && t !== 'retiro' && t !== 'retiro en local' && t !== '';
  }).length;
  const pickupCount = activeOrders.filter(o => {
    const t = (o.delivery_type ?? '').toLowerCase().trim();
    return t === 'local' || t === 'retiro' || t === 'retiro en local';
  }).length;

  // ── Clientes frecuentes ──
  const clientMap: Record<string, { orders: number; total: number }> = {};
  activeOrders.forEach(o => {
    const name = o.customer_name ?? 'Sin nombre';
    if (!clientMap[name]) clientMap[name] = { orders: 0, total: 0 };
    clientMap[name].orders += 1;
    clientMap[name].total += o.total ?? 0;
  });
  const topClients = Object.entries(clientMap)
    .map(([name, d]) => ({ name, ...d, avg: d.total / d.orders }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  // ── Tendencia: últimos 14 días ──
  const last14: Record<string, { total: number; orders: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    last14[key] = { total: 0, orders: 0 };
  }
  activeOrders.forEach(o => {
    const d = new Date(o.created_at);
    const key = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    if (last14[key]) {
      last14[key].total += o.total ?? 0;
      last14[key].orders += 1;
    }
  });
  const trendData = Object.entries(last14).map(([date, d]) => ({ date, ...d }));
  const maxTrend = Math.max(...trendData.map(d => d.total), 1);

  // ── Últimos pedidos ──
  const recentOrders = orders.slice(0, 8);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="admin-layout">
      <AdminSidebar email={email} />
      <main className="main-content">
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          .dash-section { animation: fadeUp 0.4s ease both; }
          .range-btn {
            padding: 5px 14px; border-radius: 20px;
            border: 0.5px solid rgba(245,240,232,0.12);
            background: transparent; color: rgba(245,240,232,0.45);
            font-size: 12px; cursor: pointer; transition: all 0.2s; font-family: inherit;
          }
          .range-btn:hover { color: rgba(245,240,232,0.8); border-color: rgba(245,240,232,0.25); }
          .range-btn.active { background: rgba(245,240,232,0.1); color: rgba(245,240,232,0.9); border-color: rgba(245,240,232,0.25); }
          .dash-card { background: rgba(245,240,232,0.04); border: 0.5px solid rgba(245,240,232,0.09); border-radius: 14px; padding: 1.25rem 1.5rem; }
          .dash-card-title { font-size: 11px; color: rgba(245,240,232,0.4); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1rem; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }
          .refresh-btn {
            background: transparent; border: 0.5px solid rgba(245,240,232,0.12); border-radius: 8px;
            color: rgba(245,240,232,0.45); font-size: 12px; padding: 5px 12px; cursor: pointer;
            font-family: inherit; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
          }
          .refresh-btn:hover { color: rgba(245,240,232,0.8); border-color: rgba(245,240,232,0.25); }
          .day-bar-wrap:hover { background: rgba(245,240,232,0.04); border-radius: 8px; }
          .day-bar-wrap.selected { background: rgba(245,240,232,0.06); border-radius: 8px; outline: 0.5px solid rgba(245,240,232,0.15); }
          .heat-cell { border-radius: 3px; transition: transform 0.1s; }
          .heat-cell:hover { transform: scale(1.3); z-index: 10; position: relative; }
        `}</style>

        <div style={{ padding: '2rem 2.5rem', maxWidth: 1280, margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p className="page-eyebrow">Panel de administración</p>
              <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
              <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.3)', margin: '4px 0 0' }}>
                Actualizado {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(245,240,232,0.03)', borderRadius: 24, padding: 3, border: '0.5px solid rgba(245,240,232,0.07)' }}>
                {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
                  <button key={r} className={`range-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
                    {r === 'all' ? 'Todo' : r === '7d' ? '7 días' : r === '30d' ? '30 días' : '3 meses'}
                  </button>
                ))}
              </div>
              <button className="refresh-btn" onClick={load}><span>↻</span> Actualizar</button>
            </div>
          </div>

          {dataLoading ? <Spinner /> : (
            <>
              {/* ══ BLOQUE 1: KPIs ══ */}
              <div className="dash-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: '2rem' }}>
                {kpis.map(k => <KPICard key={k.label} kpi={k} />)}
              </div>

              {/* ══ BLOQUE 2: TENDENCIA 14 DÍAS ══ */}
              <SectionTitle>Tendencia reciente</SectionTitle>
              <div className="dash-section dash-card" style={{ marginBottom: '1.5rem', animationDelay: '40ms' }}>
                <div className="dash-card-title">Ventas — últimos 14 días</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                  {trendData.map((d, i) => {
                    const isToday = i === trendData.length - 1;
                    const pct = (d.total / maxTrend) * 100;
                    return (
                      <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{
                          width: '100%', minHeight: 3,
                          height: `${Math.max(pct, 4)}%`,
                          borderRadius: '3px 3px 1px 1px',
                          background: isToday
                            ? '#f5f0e8'
                            : d.orders > 0
                              ? 'rgba(245,240,232,0.35)'
                              : 'rgba(245,240,232,0.07)',
                          position: 'relative',
                        }}>
                          {d.orders > 0 && (
                            <div style={{
                              position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                              background: '#1a1916', border: '0.5px solid rgba(245,240,232,0.15)',
                              borderRadius: 6, padding: '3px 6px', fontSize: 9,
                              color: 'rgba(245,240,232,0.7)', whiteSpace: 'nowrap', pointerEvents: 'none',
                              opacity: 0, transition: 'opacity 0.2s',
                            }} className="bar-tooltip">
                              {fmtShort(d.total)} · {d.orders}p
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 8, color: isToday ? 'rgba(245,240,232,0.7)' : 'rgba(245,240,232,0.25)', whiteSpace: 'nowrap' }}>
                          {d.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ══ BLOQUE 3: DÍAS DE LA SEMANA ══ */}
              <SectionTitle>Comportamiento por día</SectionTitle>
              <div className="dash-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem', animationDelay: '80ms' }}>

                {/* Barras de días — ventas */}
                <div className="dash-card">
                  <div className="dash-card-title">Ventas acumuladas por día de semana</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayData.map(d => (
                      <div
                        key={d.day}
                        className={`day-bar-wrap${selectedDay === d.day ? ' selected' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', cursor: 'pointer' }}
                        onClick={() => setSelectedDay(selectedDay === d.day ? null : d.day)}
                      >
                        <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', minWidth: 28 }}>{d.label}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(245,240,232,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${(d.total / maxDayTotal) * 100}%`,
                            background: selectedDay === d.day
                              ? 'rgba(245,240,232,0.8)'
                              : 'linear-gradient(90deg, rgba(245,240,232,0.45), rgba(245,240,232,0.2))',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.6)', minWidth: 44, textAlign: 'right' }}>
                          {fmtShort(d.total)}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)', minWidth: 36, textAlign: 'right' }}>
                          {d.orders}p
                        </span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.2)', marginTop: 10 }}>
                    Hacé click en un día para ver qué se vende ese día →
                  </p>
                </div>

                {/* Drill-down por día seleccionado */}
                <div className="dash-card">
                  {selectedDay === null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <div className="dash-card-title">Día más activo</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 32, fontWeight: 700, color: '#86efac' }}>{busiestDay.fullLabel}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)' }}>
                          {busiestDay.orders} pedidos · {fmtShort(busiestDay.total)} promedio del período
                        </span>
                      </div>
                      <div>
                        <div className="dash-card-title" style={{ marginBottom: '0.5rem' }}>Seleccioná un día para ver detalles</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {dayData.filter(d => d.orders > 0).map(d => (
                            <button
                              key={d.day}
                              onClick={() => setSelectedDay(d.day)}
                              style={{
                                padding: '4px 10px', borderRadius: 20, border: '0.5px solid rgba(245,240,232,0.15)',
                                background: 'transparent', color: 'rgba(245,240,232,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              {d.label} · {d.orders}p
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div className="dash-card-title" style={{ marginBottom: 2 }}>Lo más pedido los</div>
                          <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(245,240,232,0.9)' }}>
                            {DAY_LABELS[selectedDay]}
                          </span>
                        </div>
                        <button onClick={() => setSelectedDay(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(245,240,232,0.3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {dayData.find(d => d.day === selectedDay)?.allItems.length === 0 ? (
                          <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Sin datos para este día</span>
                        ) : (
                          dayData.find(d => d.day === selectedDay)?.allItems.map((it, i) => (
                            <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.25)', minWidth: 18 }}>#{i + 1}</span>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.85)', display: 'block' }}>{it.name}</span>
                                <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>{it.category}</span>
                              </div>
                              <span style={{ fontSize: 13, color: '#86efac', fontWeight: 600 }}>{it.qty} uds.</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid rgba(245,240,232,0.07)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>
                          {dayData.find(d => d.day === selectedDay)?.orders} pedidos · {fmtShort(dayData.find(d => d.day === selectedDay)?.total ?? 0)} total
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ══ BLOQUE 4: HEATMAP HORARIO ══ */}
              <SectionTitle>Picos de demanda</SectionTitle>
              <div className="dash-section" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, marginBottom: '1.5rem', animationDelay: '120ms' }}>

                {/* Heatmap día x hora */}
                <div className="dash-card">
                  <div className="dash-card-title">Mapa de calor — día vs hora del pedido</div>
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: 500 }}>
                      {/* Labels horas */}
                      <div style={{ display: 'flex', gap: 2, marginBottom: 4, paddingLeft: 32 }}>
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} style={{ flex: 1, fontSize: 8, color: 'rgba(245,240,232,0.25)', textAlign: 'center' }}>
                            {h % 3 === 0 ? `${h}h` : ''}
                          </div>
                        ))}
                      </div>
                      {/* Filas por día */}
                      {[1, 2, 3, 4, 5, 6, 0].map(dayNum => (
                        <div key={dayNum} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.35)', minWidth: 30, textAlign: 'right', marginRight: 2 }}>
                            {DAY_SHORT[dayNum]}
                          </span>
                          {Array.from({ length: 24 }, (_, h) => {
                            const val = heatmap[`${dayNum}-${h}`] ?? 0;
                            const intensity = val / maxHeatmap;
                            return (
                              <div
                                key={h}
                                className="heat-cell"
                                title={`${DAY_LABELS[dayNum]} ${h}h: ${val} pedido${val !== 1 ? 's' : ''}`}
                                style={{
                                  flex: 1, height: 18,
                                  background: val === 0
                                    ? 'rgba(245,240,232,0.04)'
                                    : `rgba(134,239,172,${Math.max(intensity * 0.85, 0.12)})`,
                                  border: val > 0 ? '0.5px solid rgba(134,239,172,0.15)' : '0.5px solid rgba(245,240,232,0.04)',
                                }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.25)' }}>Menos</span>
                    {[0.05, 0.2, 0.4, 0.65, 0.85].map(v => (
                      <div key={v} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(134,239,172,${v})` }} />
                    ))}
                    <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.25)' }}>Más pedidos</span>
                  </div>
                </div>

                {/* Hora pico + distribución por franja */}
                <div className="dash-card">
                  <div className="dash-card-title">Distribución horaria</div>
                  {/* Franjas */}
                  {[
                    { label: 'Mañana', range: [7, 12], icon: '🌅' },
                    { label: 'Mediodía', range: [12, 16], icon: '☀️' },
                    { label: 'Tarde', range: [16, 20], icon: '🌇' },
                    { label: 'Noche', range: [20, 24], icon: '🌙' },
                    { label: 'Madrugada', range: [0, 7], icon: '🌃' },
                  ].map(franja => {
                    const count = hourData
                      .filter(h => h.hour >= franja.range[0] && h.hour < franja.range[1])
                      .reduce((s, h) => s + h.orders, 0);
                    const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                    return (
                      <div key={franja.label} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.7)' }}>{franja.icon} {franja.label}</span>
                          <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)' }}>{count}p · {pct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(245,240,232,0.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'rgba(147,197,253,0.5)' }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid rgba(245,240,232,0.07)' }}>
                    <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>Hora pico: </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#93c5fd' }}>{peakHour.hour}:00 hs</span>
                    <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', marginLeft: 6 }}>({peakHour.orders} pedidos)</span>
                  </div>
                </div>
              </div>

              {/* ══ BLOQUE 5: CATEGORÍAS ══ */}
              <SectionTitle>Análisis por categoría</SectionTitle>
              <div className="dash-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem', animationDelay: '160ms' }}>

                {/* Ranking de categorías */}
                <div className="dash-card">
                  <div className="dash-card-title">Categorías más vendidas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {categoryData.map((cat, i) => (
                      <div key={cat.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.2)', minWidth: 18 }}>#{i + 1}</span>
                            <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.85)', fontWeight: 500 }}>{cat.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.7)' }}>{cat.qty} uds</span>
                            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)', marginLeft: 6 }}>{fmtShort(cat.revenue)}</span>
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'rgba(245,240,232,0.06)', borderRadius: 2, marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${(cat.qty / maxCatQty) * 100}%`, borderRadius: 2, background: 'linear-gradient(90deg, rgba(253,230,138,0.6), rgba(253,230,138,0.2))' }} />
                        </div>
                        {cat.topProduct && (
                          <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>
                            🏆 Más vendido: <span style={{ color: 'rgba(245,240,232,0.55)' }}>{cat.topProduct[0]}</span> ({cat.topProduct[1]} uds.)
                          </span>
                        )}
                      </div>
                    ))}
                    {categoryData.length === 0 && <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Sin datos</span>}
                  </div>
                </div>

                {/* Top producto por categoría */}
                <div className="dash-card">
                  <div className="dash-card-title">Top producto por categoría</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {categoryData.map((cat) => (
                      <div key={cat.name} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '0.5px solid rgba(245,240,232,0.06)' }}>
                        <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {cat.name}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {cat.allProducts.map(([pname, qty], i) => (
                            <div key={pname} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.2)', minWidth: 14 }}>#{i + 1}</span>
                              <span style={{ fontSize: 12, color: i === 0 ? 'rgba(245,240,232,0.85)' : 'rgba(245,240,232,0.5)', flex: 1 }}>{pname}</span>
                              <span style={{ fontSize: 12, color: i === 0 ? '#fde68a' : 'rgba(245,240,232,0.35)', fontWeight: i === 0 ? 600 : 400 }}>{qty} uds.</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {categoryData.length === 0 && <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Sin datos</span>}
                  </div>
                </div>
              </div>

              {/* ══ BLOQUE 6: PRODUCTOS + ESTADO + PAGO + ENTREGA ══ */}
              <SectionTitle>Productos y operaciones</SectionTitle>
              <div className="dash-section" style={{ display: 'grid', gridTemplateColumns: '1fr 200px 180px 180px', gap: 12, marginBottom: '1.5rem', animationDelay: '200ms' }}>

                {/* Top productos */}
                <div className="dash-card">
                  <div className="dash-card-title">Productos más vendidos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topProducts.map((p, i) => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                            <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.2)', minWidth: 16 }}>#{i + 1}</span>
                            <div>
                              <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.85)', display: 'block' }}>{p.name}</span>
                              <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>{p.category}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.7)', display: 'block' }}>{p.qty} uds.</span>
                            <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>{fmtShort(p.revenue)}</span>
                          </div>
                        </div>
                        <div style={{ height: 3, background: 'rgba(245,240,232,0.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${(p.qty / maxQty) * 100}%`, background: 'linear-gradient(90deg, rgba(245,240,232,0.5), rgba(245,240,232,0.15))', borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                    {topProducts.length === 0 && <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Sin datos</span>}
                  </div>
                </div>

                {/* Estado */}
                <div className="dash-card">
                  <div className="dash-card-title">Estado</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {statusData.map(s => (
                      <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.7)', flex: 1 }}>{toStatusLabel(s.status)}</span>
                        <span style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)' }}>{s.count}</span>
                      </div>
                    ))}
                    {statusData.length === 0 && <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Sin datos</span>}
                  </div>
                </div>

                {/* Pago */}
                <div className="dash-card">
                  <div className="dash-card-title">Forma de pago</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {payData.map((p, i) => (
                      <div key={p.method}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.7)' }}>{p.method}</span>
                          <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)' }}>{p.pct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(245,240,232,0.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${p.pct}%`, borderRadius: 2, background: i === 0 ? 'rgba(134,239,172,0.6)' : 'rgba(147,197,253,0.5)' }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(245,240,232,0.25)' }}>{p.count} pedidos</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Entrega */}
                <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="dash-card-title">Tipo de entrega</div>
                  <div style={{ background: 'rgba(134,239,172,0.08)', border: '0.5px solid rgba(134,239,172,0.2)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#86efac' }}>{deliveryCount}</div>
                    <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 2 }}>🛵 Domicilio</div>
                  </div>
                  <div style={{ background: 'rgba(147,197,253,0.08)', border: '0.5px solid rgba(147,197,253,0.2)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#93c5fd' }}>{pickupCount}</div>
                    <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 2 }}>🏪 Retiro en local</div>
                  </div>
                  {totalOrders > 0 && (
                    <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.25)', textAlign: 'center' }}>
                      {Math.round((deliveryCount / totalOrders) * 100)}% delivery
                    </span>
                  )}
                </div>
              </div>

              {/* ══ BLOQUE 7: CLIENTES FRECUENTES ══ */}
              <SectionTitle>Clientes</SectionTitle>
              <div className="dash-section dash-card" style={{ marginBottom: '1.5rem', animationDelay: '240ms' }}>
                <div className="dash-card-title">Clientes más frecuentes del período</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  {topClients.map((c, i) => (
                    <div key={c.name} style={{
                      background: 'rgba(245,240,232,0.03)', border: '0.5px solid rgba(245,240,232,0.07)',
                      borderRadius: 10, padding: '0.75rem 1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.25)' }}>#{i + 1}</span>
                        <span style={{ fontSize: 10, color: '#fde68a' }}>{c.orders} pedidos</span>
                      </div>
                      <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.85)', fontWeight: 500, display: 'block', marginBottom: 2 }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)' }}>
                        Total: {fmtShort(c.total)} · Prom: {fmtShort(c.avg)}
                      </span>
                    </div>
                  ))}
                  {topClients.length === 0 && <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: 13 }}>Sin datos</span>}
                </div>
              </div>

              {/* ══ BLOQUE 8: ÚLTIMOS PEDIDOS ══ */}
              <SectionTitle>Actividad reciente</SectionTitle>
              <div className="dash-section dash-card" style={{ animationDelay: '280ms' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="dash-card-title" style={{ margin: 0 }}>Últimos pedidos</span>
                  <a href="/admin/pedidos" style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', textDecoration: 'none' }}>Ver todos →</a>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Código', 'Cliente', 'Total', 'Pago', 'Entrega', 'Estado', 'Fecha'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '0 12px 10px 0',
                            color: 'rgba(245,240,232,0.3)', fontWeight: 500,
                            fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                            borderBottom: '0.5px solid rgba(245,240,232,0.07)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map(o => {
                        const color = STATUS_COLORS[o.status] ?? '#888';
                        const date = new Date(o.created_at);
                        return (
                          <tr key={o.id} style={{ borderBottom: '0.5px solid rgba(245,240,232,0.05)' }}>
                            <td style={{ padding: '9px 12px 9px 0', color: 'rgba(245,240,232,0.5)', fontFamily: 'monospace', fontSize: 12 }}>
                              {o.order_code ?? o.id.slice(0, 6).toUpperCase()}
                            </td>
                            <td style={{ padding: '9px 12px 9px 0', color: 'rgba(245,240,232,0.85)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.customer_name}
                            </td>
                            <td style={{ padding: '9px 12px 9px 0', color: 'rgba(245,240,232,0.85)', fontWeight: 600 }}>
                              {fmt(o.total ?? 0)}
                            </td>
                            <td style={{ padding: '9px 12px 9px 0', color: 'rgba(245,240,232,0.45)' }}>{o.payment_method ?? '—'}</td>
                            <td style={{ padding: '9px 12px 9px 0', color: 'rgba(245,240,232,0.45)' }}>{o.delivery_type ?? '—'}</td>
                            <td style={{ padding: '9px 12px 9px 0' }}>
                              <span className="status-badge" style={{ background: `${color}18`, color, border: `0.5px solid ${color}40` }}>
                                {toStatusLabel(o.status)}
                              </span>
                            </td>
                            <td style={{ padding: '9px 0 9px 0', color: 'rgba(245,240,232,0.3)', fontSize: 12 }}>
                              {date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} · {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {recentOrders.length === 0 && (
                    <p style={{ color: 'rgba(245,240,232,0.3)', textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>
                      No hay pedidos en este período.
                    </p>
                  )}
                </div>
              </div>

            </>
          )}
        </div>
      </main>
    </div>
  );
}
