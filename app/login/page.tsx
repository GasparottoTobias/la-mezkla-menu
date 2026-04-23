'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); return; }
    router.push('/admin');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .lm-page { min-height: 100vh; display: flex; background: #0e0d0b; font-family: 'DM Sans', sans-serif; }

        .lm-side {
          width: 42%; background: #1a1713; padding: 3rem 2.5rem;
          display: flex; flex-direction: column; justify-content: space-between;
          border-right: 0.5px solid rgba(255,255,255,0.06);
          position: relative; overflow: hidden;
        }

        .lm-side::before {
          content: ''; position: absolute; top: -60px; left: -60px;
          width: 240px; height: 240px; border-radius: 50%;
          background: radial-gradient(circle, rgba(197,147,79,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .lm-logo {
          font-family: 'Playfair Display', serif; font-style: italic;
          font-size: 13px; letter-spacing: 0.08em;
          color: rgba(255,255,255,0.3); text-transform: uppercase;
        }

        .lm-headline { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 2rem 0; }

        .lm-eyebrow {
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #c5934f; margin-bottom: 1rem; font-weight: 400;
        }

        .lm-title {
          font-family: 'Playfair Display', serif; font-size: 3.2rem;
          font-weight: 700; line-height: 1.05; color: #f5f0e8; margin-bottom: 1.5rem;
        }

        .lm-title em { font-style: italic; color: #c5934f; }

        .lm-tagline {
          font-size: 13px; line-height: 1.7; color: rgba(255,255,255,0.35);
          font-weight: 300; max-width: 220px;
        }

        .lm-deco { font-size: 11px; color: rgba(255,255,255,0.15); letter-spacing: 0.05em; }

        .lm-big-num {
          position: absolute; bottom: 2.5rem; right: 2rem;
          font-family: 'Playfair Display', serif; font-size: 6rem;
          font-weight: 700; color: rgba(255,255,255,0.03);
          line-height: 1; user-select: none; pointer-events: none;
        }

        .lm-form-area {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 3rem 4rem;
        }

        .lm-form-inner { width: 100%; max-width: 360px; }

        .lm-form-pretitle {
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(255,255,255,0.25); margin-bottom: 0.5rem;
        }

        .lm-form-title {
          font-family: 'Playfair Display', serif; font-size: 2rem;
          font-weight: 700; color: #f5f0e8; margin-bottom: 2.5rem;
        }

        .lm-label {
          display: block; font-size: 11px; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
          margin-bottom: 0.5rem; font-weight: 400;
        }

        .lm-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.12); border-radius: 6px;
          padding: 0.8rem 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: #f5f0e8; outline: none;
          transition: border-color 0.2s, background 0.2s; font-weight: 300;
          margin-bottom: 1.3rem;
        }

        .lm-input::placeholder { color: rgba(255,255,255,0.18); }
        .lm-input:focus { border-color: #c5934f; background: rgba(197,147,79,0.05); }

        .lm-error {
          background: rgba(226,75,74,0.1); border: 0.5px solid rgba(226,75,74,0.3);
          border-radius: 6px; padding: 0.65rem 0.9rem;
          font-size: 13px; color: #f09595; margin-bottom: 1.3rem;
        }

        .lm-btn {
          width: 100%; background: #c5934f; border: none; border-radius: 6px;
          padding: 0.9rem 1.5rem; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: #0e0d0b; cursor: pointer;
          letter-spacing: 0.05em; transition: background 0.2s, opacity 0.2s;
        }

        .lm-btn:hover { background: #d4a464; }
        .lm-btn:active { opacity: 0.85; }

        .lm-divider { height: 0.5px; background: rgba(255,255,255,0.06); margin: 1.8rem 0; }

        .lm-footer { font-size: 12px; color: rgba(255,255,255,0.2); text-align: center; line-height: 1.6; }

        @media (max-width: 768px) { .lm-side { display: none; } .lm-form-area { padding: 2rem; } }
      `}</style>

      <div className="lm-page">

        <div className="lm-side">
          <span className="lm-logo">La Mezkla</span>

          <div className="lm-headline">
            <p className="lm-eyebrow">Panel de administración</p>
            <h1 className="lm-title">
              Todo<br />en <em>un</em><br />lugar.
            </h1>
            <p className="lm-tagline">
              Gestiona tu contenido, pedidos y equipo desde un solo panel.
            </p>
          </div>

          <span className="lm-deco">© 2026 La Mezkla</span>
          <span className="lm-big-num">01</span>
        </div>

        <div className="lm-form-area">
          <div className="lm-form-inner">
            <p className="lm-form-title">Iniciar sesión</p>

            <form onSubmit={handleLogin}>
              <label className="lm-label">Correo electrónico</label>
              <input
                className="lm-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label className="lm-label">Contraseña</label>
              <input
                className="lm-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && <p className="lm-error">{error}</p>}

              <button type="submit" className="lm-btn">Entrar</button>
            </form>

            <div className="lm-divider" />
            <p className="lm-footer">¿Problemas para acceder? Contactá al administrador del sistema.</p>
          </div>
        </div>

      </div>
    </>
  );
}
