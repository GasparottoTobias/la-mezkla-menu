'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/AdminSidebar';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  order_index: number;
  is_active: boolean;
};

type CategoryWithProducts = {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  products: Product[];
};

function todayFileSuffix() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return day + '-' + month + '-' + year;
}

async function fetchActiveMenu(): Promise<CategoryWithProducts[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, order_index, is_active, products (id, name, description, price, order_index, is_active)')
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'products', ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((category) => ({
      ...category,
      products: category.products.filter((product) => product.is_active),
    }))
    .filter((category) => category.products.length > 0) as CategoryWithProducts[];
}

export default function CartaPage() {
  const router = useRouter();
  const previewUrlRef = useRef<string | null>(null);
  const generationIdRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [menu, setMenu] = useState<CategoryWithProducts[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const buildPreview = useCallback(async (latestMenu: CategoryWithProducts[]) => {
    const generationId = generationIdRef.current + 1;
    generationIdRef.current = generationId;
    setGenerating(true);

    try {
      if (latestMenu.length === 0) {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
        setPageCount(0);
        return;
      }

      const { createCartaPdf } = await import('@/lib/cartaPdf');
      const result = await createCartaPdf(latestMenu, todayFileSuffix());

      if (generationId !== generationIdRef.current) return;

      const nextPreviewUrl = URL.createObjectURL(result.blob);
      const previousPreviewUrl = previewUrlRef.current;
      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
      setPageCount(result.pageCount);

      if (previousPreviewUrl) URL.revokeObjectURL(previousPreviewUrl);
    } finally {
      if (generationId === generationIdRef.current) setGenerating(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }

      try {
        const latestMenu = await fetchActiveMenu();
        if (cancelled) return;

        setEmail(data.session.user.email ?? null);
        setMenu(latestMenu);
        await buildPreview(latestMenu);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError('No se pudo cargar ni generar la carta.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [buildPreview, router]);

  useEffect(() => {
    return () => {
      generationIdRef.current += 1;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    if (generating) return;

    setError(null);
    try {
      const latestMenu = await fetchActiveMenu();
      setMenu(latestMenu);
      await buildPreview(latestMenu);
    } catch (refreshError) {
      console.error(refreshError);
      setError('No se pudo actualizar la vista previa.');
    }
  };

  const totalProducts = menu.reduce(
    (total, category) => total + category.products.length,
    0
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0d0b' }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'rgba(245,240,232,0.4)', fontSize: '1.1rem' }}>
          Preparando la carta…
        </p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar email={email} />

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Panel de administración</p>
            <h1 className="page-title">Carta imprimible</h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-lg"
              onClick={handleRefresh}
              disabled={generating}
            >
              {generating ? 'Actualizando…' : 'Actualizar vista previa'}
            </button>

            <a
              className="btn btn-primary btn-lg"
              href={previewUrl ?? undefined}
              download={'carta-' + todayFileSuffix() + '.pdf'}
              aria-disabled={!previewUrl || generating}
              onClick={(event) => {
                if (!previewUrl || generating) {
                  event.preventDefault();
                  return;
                }

                // Calcula la fecha al hacer clic, no al abrir la vista previa.
                event.currentTarget.download = 'carta-' + todayFileSuffix() + '.pdf';
              }}
              style={!previewUrl || generating ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            >
              Descargar PDF
            </a>
          </div>
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'var(--color-danger-border)' }}>
            <p style={{ color: 'var(--color-danger-text)', fontSize: '13px' }}>{error}</p>
          </div>
        )}

        <section className="card" aria-busy={generating}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Vista previa del PDF</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                El archivo descargado es exactamente el mismo que se muestra acá.
              </p>
            </div>

            <span className="badge badge-gold">
              {totalProducts} productos · {menu.length} categorías
              {pageCount > 0 ? ' · ' + pageCount + (pageCount === 1 ? ' página' : ' páginas') : ''}
            </span>
          </div>

          {generating && !previewUrl ? (
            <div style={{ minHeight: '420px', display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
              Generando vista previa…
            </div>
          ) : previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl + '#view=FitH&toolbar=1&navpanes=0'}
              title="Vista previa de la carta en PDF"
              style={{
                display: 'block',
                width: '100%',
                height: 'min(78vh, 900px)',
                minHeight: '560px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: '#24211d',
              }}
            />
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem', fontStyle: 'italic' }}>
              No hay categorías ni productos activos para mostrar.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
