'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Category = {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  order_index: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // producto (crear)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // edición producto
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  // categorías
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // 🔹 filtro productos
  const [filterCategoryId, setFilterCategoryId] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setEmail(data.session.user.email ?? null);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('order_index');
    setCategories(data ?? []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, description, price, category_id, order_index')
      .order('category_id')
      .order('order_index');

    setProducts(data ?? []);
  };

  const filteredProducts = filterCategoryId
    ? products.filter((p) => p.category_id === filterCategoryId)
    : products;

  // ======================
  // CATEGORÍAS
  // ======================

  const createCategory = async () => {
    if (!newCategory.trim()) return;

    const maxOrder =
      categories.length > 0
        ? Math.max(...categories.map((c) => c.order_index))
        : 0;

    await supabase.from('categories').insert({
      name: newCategory,
      order_index: maxOrder + 1,
    });

    setNewCategory('');
    loadCategories();
  };

  const saveCategoryName = async (id: string) => {
    await supabase
      .from('categories')
      .update({ name: editCategoryName })
      .eq('id', id);

    setEditingCategoryId(null);
    loadCategories();
  };

  const toggleCategory = async (c: Category) => {
    await supabase
      .from('categories')
      .update({ is_active: !c.is_active })
      .eq('id', c.id);

    loadCategories();
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const current = categories[index];
    const target = categories[targetIndex];

    await supabase
      .from('categories')
      .update({ order_index: target.order_index })
      .eq('id', current.id);

    await supabase
      .from('categories')
      .update({ order_index: current.order_index })
      .eq('id', target.id);

    loadCategories();
  };

  // ======================
  // PRODUCTOS
  // ======================

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) return;

    const sameCategory = products.filter(p => p.category_id === categoryId);
    const maxOrder =
      sameCategory.length > 0
        ? Math.max(...sameCategory.map(p => p.order_index))
        : 0;

    await supabase.from('products').insert({
      name,
      description: description || null,
      price: Number(price),
      category_id: categoryId,
      order_index: maxOrder + 1,
    });

    setName('');
    setDescription('');
    setPrice('');
    setCategoryId('');
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

    await supabase
      .from('products')
      .update({ order_index: target.order_index })
      .eq('id', product.id);

    await supabase
      .from('products')
      .update({ order_index: product.order_index })
      .eq('id', target.id);

    loadProducts();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDescription(p.description ?? '');
    setEditPrice(String(p.price));
    setEditCategoryId(p.category_id);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    await supabase
      .from('products')
      .update({
        name: editName,
        description: editDescription || null,
        price: Number(editPrice),
        category_id: editCategoryId,
      })
      .eq('id', editingId);

    setEditingId(null);
    loadProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;
  }

  return (
    <div className="min-h-screen p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <button onClick={handleLogout} className="border px-4 py-2">
          Cerrar sesión
        </button>
      </header>

      <p className="text-sm text-gray-600">
        Sesión iniciada como: <strong>{email}</strong>
      </p>

      {/* ================= CATEGORÍAS ================= */}
      <section className="border p-4">
        <h2 className="font-semibold mb-4">Categorías</h2>

        <div className="flex gap-2 mb-4">
          <input
            className="border p-2 flex-1"
            placeholder="Nueva categoría"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button onClick={createCategory} className="bg-black text-white px-4">
            Agregar
          </button>
        </div>

        <ul className="space-y-2">
          {categories.map((c, i) => (
            <li key={c.id} className="border p-2 flex justify-between items-center">
              {editingCategoryId === c.id ? (
                <>
                  <input
                    className="border p-1"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                  />
                  <button onClick={() => saveCategoryName(c.id)}>Guardar</button>
                </>
              ) : (
                <>
                  <span className={!c.is_active ? 'line-through text-gray-400' : ''}>
                    {c.name}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => moveCategory(i, 'up')}>↑</button>
                    <button onClick={() => moveCategory(i, 'down')}>↓</button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(c.id);
                        setEditCategoryName(c.name);
                      }}
                    >
                      Editar
                    </button>
                    <button onClick={() => toggleCategory(c)}>
                      {c.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ================= PRODUCTOS ================= */}
      <section className="grid grid-cols-2 gap-8">
        <div className="border p-4">
          <h2 className="font-semibold mb-4">Crear producto</h2>

          <form onSubmit={createProduct} className="space-y-3">
            <input className="w-full border p-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="w-full border p-2" placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="w-full border p-2" type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} />
            <select className="w-full border p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Categoría</option>
              {categories.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="w-full bg-black text-white p-2">Crear</button>
          </form>
        </div>

        <div className="border p-4">
          <h2 className="font-semibold mb-4">Productos</h2>

          <select className="w-full border p-2 mb-4" value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <ul className="space-y-2">
            {filteredProducts.map((p) => (
              <li key={p.id} className="border p-2">
                {editingId === p.id ? (
                  <div className="space-y-2">
                    <input className="border p-1 w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <textarea className="border p-1 w-full" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                    <input className="border p-1 w-full" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                    <select className="border p-1 w-full" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button onClick={saveEdit}>Guardar</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span>{p.name} — ${p.price}</span>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => moveProduct(p, 'up')}>↑</button>
                      <button onClick={() => moveProduct(p, 'down')}>↓</button>
                      <button onClick={() => startEdit(p)}>Editar</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-red-600">Eliminar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
