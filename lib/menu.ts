import { supabase } from "./supabase";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
};

export type CategoryWithProducts = {
  id: string;
  name: string;
  order_index: number;
  products: Product[];
};

export async function getMenu(): Promise<CategoryWithProducts[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      order_index,
      products (
        id,
        name,
        description,
        price,
        image_url,
        order_index
      )
    `)
    .eq("products.is_active", true)
    .order("order_index", { ascending: true })
    .order("order_index", { foreignTable: "products", ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Error cargando el menú");
  }

  return data as CategoryWithProducts[];
}
