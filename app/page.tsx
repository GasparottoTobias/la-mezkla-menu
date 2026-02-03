import { getMenu } from "@/lib/menu";

export default async function Page() {
  const menu = await getMenu();

  return (
    <main style={{ padding: 24 }}>
      {menu.map((category) => (
        <section key={category.id} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: "bold" }}>
            {category.name}
          </h2>

          <ul>
            {category.products.map((product) => (
              <li key={product.id}>
                <strong>{product.name}</strong> — ${product.price}
                {product.description && (
                  <p style={{ opacity: 0.8 }}>{product.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
