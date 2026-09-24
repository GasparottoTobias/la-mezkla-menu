import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type OrderItemInput = { productId: string; price: number; qty: number }

function genOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, notes, deliveryType, paymentMethod, items } = body ?? {}
    if (typeof customerName !== 'string' || !customerName.trim() || customerName.length > 200 ||
      (notes != null && (typeof notes !== 'string' || notes.length > 2000)) ||
      !['domicilio', 'local'].includes(deliveryType) ||
      !['Efectivo', 'Transferencia'].includes(paymentMethod) ||
      !Array.isArray(items) || items.length === 0 || items.length > 100 ||
      items.some(i => !i || typeof i.productId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.productId) ||
        !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 100 ||
        !Number.isFinite(i.price) || i.price <= 0)) {
      return NextResponse.json({ error: 'Revisá los datos y los productos del pedido.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error('Falta la configuración de Supabase del servidor para pedidos.')
      return NextResponse.json({ error: 'Los pedidos no están disponibles en este momento.' }, { status: 503 })
    }
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Validate against the current catalog, never trust prices from the browser.
    const { data: products, error: catalogError } = await supabase.from('products')
      .select('id, name, price, is_active, is_available_for_delivery, categories(name, is_active, is_available_for_delivery)')
      .in('id', items.map((i: OrderItemInput) => i.productId))
    if (catalogError) throw catalogError

    const orderItems = []
    for (const item of items as OrderItemInput[]) {
      const product = products?.find(p => p.id === item.productId)
      const category = Array.isArray(product?.categories) ? product.categories[0] : product?.categories
      if (!product?.is_active || !product.is_available_for_delivery || !category?.is_active ||
        !category.is_available_for_delivery || !(product.price > 0) || Number(product.price) !== item.price) {
        return NextResponse.json({ error: 'Un producto cambió de precio o no está disponible. Volvé al menú y actualizá tu carrito.' }, { status: 409 })
      }
      orderItems.push({
        product_id: product.id, product_name: product.name, category_name: category.name,
        quantity: item.qty, unit_price: Number(product.price), subtotal: Number(product.price) * item.qty,
      })
    }
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
    const orderCode = genOrderCode()
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      order_code: orderCode, customer_name: customerName.trim(), notes: notes?.trim() || null,
      delivery_type: deliveryType, payment_method: paymentMethod, delivery_cost: 0,
      subtotal, total: subtotal, status: 'pending',
    }).select('id').single()
    if (orderError || !order) throw orderError ?? new Error('No se creó la orden')

    const { error: itemsError } = await supabase.from('order_items')
      .insert(orderItems.map(item => ({ ...item, order_id: order.id })))
    if (itemsError) {
      // Never report success with an incomplete order.
      const { error: cleanupError } = await supabase.from('orders').delete().eq('id', order.id)
      if (cleanupError) console.error('No se pudo retirar la orden incompleta:', cleanupError)
      throw itemsError
    }
    return NextResponse.json({ orderCode })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
    }
    console.error('Error en /api/orders:', err)
    return NextResponse.json({ error: 'No se pudo guardar el pedido. Intentá nuevamente.' }, { status: 500 })
  }
}
