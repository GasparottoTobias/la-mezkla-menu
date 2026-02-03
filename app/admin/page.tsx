'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  category_id: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // form crear
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

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
      .select('id, name')
      .order('order_index');
    setCategories(data ?? []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, category_id')
      .order('created_at', { ascending: false });
    setProducts(data ?? []);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) return;

    await supabase.from('products').insert({
      name,
      price: Number(price),
      category_id: categoryId,
    });

    setName('');
    setPrice('');
    setCategoryId('');
    loadProducts();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditCategoryId(p.category_id);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    await supabase
      .from('products')
      .update({
        name: editName,
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <button onClick={handleLogout} className="border px-4 py-2">
          Cerrar sesión
        </button>
      </header>

      <p className="text-sm text-gray-600">
        Sesión iniciada como: <strong>{email}</strong>
      </p>

      <main className="grid grid-cols-2 gap-8">
        {/* Crear producto */}
        <div className="border p-4">
          <h2 className="font-semibold mb-4">Crear producto</h2>

          <form onSubmit={createProduct} className="space-y-3">
            <input
              className="w-full border p-2"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full border p-2"
              placeholder="Precio"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <select
              className="w-full border p-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button className="w-full bg-black text-white p-2">
              Crear
            </button>
          </form>
        </div>

        {/* Productos */}
        <div className="border p-4">
          <h2 className="font-semibold mb-4">Productos</h2>

          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id} className="border p-2">
                {editingId === p.id ? (
                  <div className="space-y-2">
                    <input
                      className="w-full border p-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      className="w-full border p-1"
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                    <select
                      className="w-full border p-1"
                      value={editCategoryId}
                      onChange={(e) =>
                        setEditCategoryId(e.target.value)
                      }
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-2 py-1 bg-black text-white"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 border"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span>
                      {p.name} — ${p.price}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-sm underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-sm text-red-600 underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
