'use client';

import { useEffect, useState } from "react";

export default function QRPage() {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    fetch("/api/qr")
      .then(res => res.json())
      .then(data => setQr(data.qr));
  }, []);

  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      <h1>QR del menú</h1>

      {qr ? (
        <img src={qr} alt="QR Menu" style={{ width: 250 }} />
      ) : (
        <p>Generando QR...</p>
      )}
    </main>
  );
}
