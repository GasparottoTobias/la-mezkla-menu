import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente con service role para saltear RLS en inserts del lado servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function genOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, notes, deliveryType, paymentMethod, items } = body as {
      customerName: string
      notes: string
      deliveryType: 'domicilio' | 'local'
      paymentMethod: string
      items: {
        productId: string
        name: string
        category: string
        price: number
        qty: number
      }[]
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 })
    }

    const DELIVERY_COST = deliveryType === 'domicilio' ? 0 : 0 // ajustá si cobrás envío
    const subtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0)
    const total = subtotal + DELIVERY_COST
    const orderCode = genOrderCode()

    // 1. Insertar la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_code: orderCode,
        customer_name: customerName,
        notes: notes || null,          // ← era "address", ahora es "notes"
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        delivery_cost: DELIVERY_COST,
        subtotal,
        total,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Error insertando order:', orderError)
      return NextResponse.json(
        { error: orderError?.message ?? 'Error al crear orden' },
        { status: 500 }
      )
    }

    // 2. Insertar los items
    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.name,
      category_name: i.category,
      quantity: i.qty,
      unit_price: i.price,
      subtotal: i.price * i.qty,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      console.error('Error insertando order_items:', itemsError)
      // La orden quedó creada igual, devolvemos el código de todas formas
    }

    return NextResponse.json({ orderCode })
  } catch (err) {
    console.error('Error inesperado en /api/orders:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}