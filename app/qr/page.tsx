'use client';

import { useEffect, useState } from "react";
import Image from "next/image";

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
        <Image src={qr} alt="QR Menu" width={250} height={250} unoptimized />
      ) : (
        <p>Generando QR...</p>
      )}
    </main>
  );
}
