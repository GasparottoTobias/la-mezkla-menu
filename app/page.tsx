import Image from "next/image";
import { getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export default async function Page() {
  const menu = await getMenu();

  return (
    <>
      {/* HEADER STICKY */}
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "#0a0a0a",
          zIndex: 1000,
          padding: "10px 0",
          borderBottom: "1px solid #222", // línea más sutil para fondo oscuro
        }}
      >
        <div
          style={{
            position: "relative",
            width: 140,
            height: 50,
            margin: "0 auto",
          }}
        >
          <Image
            src="/logo.png"
            alt="La Mezkla Logo"
            fill
            style={{ objectFit: "contain" }}
            sizes="140px"
            priority
          />
        </div>
      </header>

      {/* CONTENIDO */}
      <main
        style={{
          padding: 24,
          maxWidth: 600, // evita que en desktop se estire demasiado
          margin: "0 auto", // centra el contenido
        }}
      >
        {menu.map((category) => (
          <section
            key={category.id}
            style={{
              marginBottom: 40,
              paddingBottom: 24,
              borderBottom: "1px solid #1a1a1a", // separador sutil entre categorías
            }}
          >
            {/* TÍTULO DE CATEGORÍA */}
            <h2
              style={{
                fontSize: 20, // menos agresivo que 24
                fontWeight: 600,
                marginBottom: 20,
                letterSpacing: 0.5, // pequeño ajuste tipográfico
              }}
            >
              {category.name}
            </h2>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {category.products.map((product) => (
                <li
                  key={product.id}
                  style={{
                    marginBottom: 22, // espacio entre productos
                  }}
                >
                  {/* FILA SUPERIOR: nombre izquierda, precio derecha */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 16,
                      }}
                    >
                      {product.name}
                    </strong>

                    <span
                      style={{
                        fontWeight: 600,
                        color: "#f5c542", // color cálido para destacar precio
                      }}
                    >
                      ${product.price}
                    </span>
                  </div>

                  {/* DESCRIPCIÓN */}
                  {product.description && (
                    <p
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        opacity: 0.75,
                        lineHeight: 1.4, // mejora lectura en mobile
                      }}
                    >
                      {product.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
