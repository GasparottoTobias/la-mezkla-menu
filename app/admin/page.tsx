'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/AdminSidebar';

type Category = {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  is_available_for_delivery: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  order_index: number;
  is_available_for_delivery: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newProductAvailableForDelivery, setNewProductAvailableForDelivery] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAvailableForDelivery, setEditAvailableForDelivery] = useState(true);

  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [filterCategoryId, setFilterCategoryId] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/login'); return; }
      setEmail(data.session.user.email ?? null);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => { loadCategories(); loadProducts(); }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, order_index, is_active, is_available_for_delivery')
      .order('order_index');
    setCategories(data ?? []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, description, price, category_id, order_index, is_available_for_delivery')
      .order('category_id').order('order_index');
    setProducts(data ?? []);
  };

  const filteredProducts = filterCategoryId
    ? products.filter((p) => p.category_id === filterCategoryId)
    : products;

  const createCategory = async () => {
    if (!newCategory.trim()) return;
    const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.order_index)) : 0;
    await supabase.from('categories').insert({ name: newCategory, order_index: maxOrder + 1 });
    setNewCategory('');
    loadCategories();
  };

  const saveCategoryName = async (id: string) => {
    await supabase.from('categories').update({ name: editCategoryName }).eq('id', id);
    setEditingCategoryId(null);
    loadCategories();
  };

  const toggleCategory = async (c: Category) => {
    await supabase.from('categories').update({ is_active: !c.is_active }).eq('id', c.id);
    loadCategories();
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const current = categories[index];
    const target = categories[targetIndex];
    await supabase.from('categories').update({ order_index: target.order_index }).eq('id', current.id);
    await supabase.from('categories').update({ order_index: current.order_index }).eq('id', target.id);
    loadCategories();
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) return;
    const sameCategory = products.filter(p => p.category_id === categoryId);
    const maxOrder = sameCategory.length > 0 ? Math.max(...sameCategory.map(p => p.order_index)) : 0;
    await supabase.from('products').insert({
      name,
      description: description || null,
      price: Number(price),
      category_id: categoryId,
      order_index: maxOrder + 1,
      is_available_for_delivery: newProductAvailableForDelivery,
    });
    setName(''); setDescription(''); setPrice(''); setCategoryId('');
    setNewProductAvailableForDelivery(true);
    loadProducts();
  };

  const moveProduct = async (product: Product, direction: 'up' | 'down') => {
    const sameCategory = products
      .filter(p => p.category_id === product.category_id)
      .sort((a, b) => a.order_index - b.order_index);
    const index = sameCategory.findIndex(p => p.id === product.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sameCategory.length) return;
    const target = sameCategory[targetIndex];
    await supabase.from('products').update({ order_index: target.order_index }).eq('id', product.id);
    await supabase.from('products').update({ order_index: product.order_index }).eq('id', target.id);
    loadProducts();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDescription(p.description ?? '');
    setEditPrice(String(p.price));
    setEditCategoryId(p.category_id);
    setEditAvailableForDelivery(p.is_available_for_delivery);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from('products').update({
      name: editName,
      description: editDescription || null,
      price: Number(editPrice),
      category_id: editCategoryId,
      is_available_for_delivery: editAvailableForDelivery,
    }).eq('id', editingId);
    setEditingId(null);
    loadProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  };

  const getCategoryName = (id: string) =>
    categories.find(c => c.id === id)?.name ?? '—';

  const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0d0b' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'rgba(245,240,232,0.4)', fontSize: '1.1rem' }}>
          Cargando…
        </p>
      </div>
    );
  }

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ── */}
      <AdminSidebar email={email} />

      {/* ── MAIN ── */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <div className="page-header">
          <div>
            <p className="page-eyebrow">Panel de administración</p>
            <h1 className="page-title">Categorías y productos</h1>
          </div>
        </div>

        {/* ── CATEGORÍAS ── */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Categorías</h2>
            <span className="badge badge-gold">{categories.length} categorías</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              className="form-input"
              style={{ marginBottom: 0 }}
              placeholder="Nueva categoría…"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createCategory()}
            />
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={createCategory}>
              + Agregar
            </button>
          </div>

          <div className="table-wrapper">
            <table className="lm-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Disponible para pedidos</th>
                  <th>Orden</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      {editingCategoryId === c.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            className="form-input"
                            style={{ marginBottom: 0, padding: '0.4rem 0.75rem', fontSize: '13px' }}
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => saveCategoryName(c.id)}>Guardar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingCategoryId(null)}>Cancelar</button>
                        </div>
                      ) : (
                        <span style={{
                          textDecoration: !c.is_active ? 'line-through' : 'none',
                          color: !c.is_active ? 'rgba(245,240,232,0.25)' : undefined,
                        }}>
                          {c.name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {c.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={c.is_available_for_delivery}
                          onChange={async () => {
                            await supabase
                              .from('categories')
                              .update({ is_available_for_delivery: !c.is_available_for_delivery })
                              .eq('id', c.id);
                            loadCategories();
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td className="muted">#{c.order_index}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => moveCategory(i, 'up')}>↑</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => moveCategory(i, 'down')}>↓</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingCategoryId(c.id); setEditCategoryName(c.name); }}>
                          Editar
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleCategory(c)}>
                          {c.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── PRODUCTOS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Crear producto */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Crear producto</h2>
            </div>

            <form onSubmit={createProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div style={field}>
                <span className="form-label">Nombre</span>
                <input
                  className="form-input"
                  placeholder="Ej: Milanesa napolitana"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={field}>
                <span className="form-label">Descripción</span>
                <textarea
                  className="form-textarea"
                  placeholder="Descripción opcional…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={field}>
                <span className="form-label">Precio</span>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div style={field}>
                <span className="form-label">Categoría</span>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {categories.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <span className="form-label">Disponible para pedidos</span>
                <label className="switch" style={{ alignSelf: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={newProductAvailableForDelivery}
                    onChange={(e) => setNewProductAvailableForDelivery(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.25rem' }}>
                Crear producto
              </button>

            </form>
          </section>

          {/* Lista productos */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Productos</h2>
              <span className="badge badge-gold">{filteredProducts.length} items</span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <select
                className="form-select"
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="table-wrapper">
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Para pedido</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      {editingId === p.id ? (
                        <td colSpan={5}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.5rem 0' }}>

                            <div style={field}>
                              <span className="form-label">Nombre</span>
                              <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>

                            <div style={field}>
                              <span className="form-label">Precio</span>
                              <input className="form-input" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                            </div>

                            <div style={{ ...field, gridColumn: '1 / -1' }}>
                              <span className="form-label">Descripción</span>
                              <textarea className="form-textarea" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ minHeight: '60px' }} />
                            </div>

                            <div style={field}>
                              <span className="form-label">Categoría</span>
                              <select className="form-select" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div style={field}>
                              <span className="form-label">Disponible para pedidos</span>
                              <label className="switch" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                                <input
                                  type="checkbox"
                                  checked={editAvailableForDelivery}
                                  onChange={(e) => setEditAvailableForDelivery(e.target.checked)}
                                />
                                <span className="slider"></span>
                              </label>
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={saveEdit}>Guardar</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                            </div>

                          </div>
                        </td>
                      ) : (
                        <>
                          <td>
                            <p style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>{p.name}</p>
                            {p.description && (
                              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{p.description}</p>
                            )}
                          </td>
                          <td className="muted">{getCategoryName(p.category_id)}</td>
                          <td>
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={p.is_available_for_delivery}
                                onChange={async () => {
                                  await supabase
                                    .from('products')
                                    .update({ is_available_for_delivery: !p.is_available_for_delivery })
                                    .eq('id', p.id);
                                  loadProducts();
                                }}
                              />
                              <span className="slider"></span>
                            </label>
                          </td>
                          <td style={{ color: 'var(--color-gold)', fontWeight: 500 }}>
                            ${p.price.toLocaleString('es-AR')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => moveProduct(p, 'up')}>↑</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => moveProduct(p, 'down')}>↓</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)}>Editar</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>Eliminar</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem', fontStyle: 'italic' }}>
                        No hay productos en esta categoría
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}