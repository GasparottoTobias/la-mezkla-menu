export default function Home() {
  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        La Mezkla
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">
          Entradas
        </h2>

        <div className="space-y-3">
          <div>
            <p className="font-medium">Empanadas</p>
            <p className="text-sm text-gray-600">
              Carne cortada a cuchillo
            </p>
            <p className="font-semibold">$1200</p>
          </div>

          <div>
            <p className="font-medium">Papas rústicas</p>
            <p className="text-sm text-gray-600">
              Con salsa de la casa
            </p>
            <p className="font-semibold">$1800</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">
          Bebidas
        </h2>

        <div className="space-y-3">
          <div>
            <p className="font-medium">Gaseosa</p>
            <p className="font-semibold">$900</p>
          </div>

          <div>
            <p className="font-medium">Cerveza</p>
            <p className="font-semibold">$1500</p>
          </div>
        </div>
      </section>
    </main>
  );
}
