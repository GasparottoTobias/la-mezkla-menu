import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const productId = '20000000-0000-0000-0000-000000000001'
const validBody = () => ({ customerName: 'QA', notes: '', deliveryType: 'local', paymentMethod: 'Efectivo', items: [{ productId, price: 100, qty: 2 }] })
const source = ts.transpileModule(readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function setup(options = {}) {
  const writes = []
  const product = { id: productId, name: 'Producto real', price: 100, is_active: true, is_available_for_delivery: true,
    categories: { name: 'Categoría real', is_active: true, is_available_for_delivery: true }, ...options.product }
  const client = { from(table) {
    return {
      select: () => ({ in: async () => ({ data: [product], error: options.catalogError }) }),
      insert: (data) => {
        writes.push({ table, data })
        return table === 'orders'
          ? { select: () => ({ single: async () => ({ data: { id: 'order-qa' }, error: options.orderError }) }) }
          : Promise.resolve({ error: options.itemsError })
      },
      delete: () => ({ eq: async (column, id) => { writes.push({ table, deleted: id }); return { error: null } } }),
    }
  } }
  const exports = {}
  runInNewContext(source, {
    exports, console: { error() {} }, SyntaxError,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: options.missingKey ? '' : 'test-only' } },
    require: name => {
      if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } }
      if (name === '@supabase/supabase-js') return { createClient: () => client }
      throw new Error('Unexpected import: ' + name)
    },
  })
  return { post: body => exports.POST({ json: async () => body }), writes }
}

test('persists catalog names/prices and returns the saved order code', async () => {
  const { post, writes } = setup()
  const response = await post(validBody())
  assert.equal(response.status, 200)
  assert.equal((await response.json()).orderCode, writes[0].data.order_code)
  assert.equal(writes[0].data.total, 200)
  assert.equal(writes[1].data[0].product_name, 'Producto real')
  assert.equal(writes[1].data[0].order_id, 'order-qa')
})
test('rejects invalid requests without writes', async () => {
  for (const changes of [{ customerName: '' }, { deliveryType: 'invalid' }, { paymentMethod: 'invalid' }, { items: [] },
    { items: [{ productId, price: 0, qty: 1 }] }, { items: [{ productId, price: 100, qty: -1 }] },
    { items: [{ productId, price: 100, qty: 1.5 }] }]) {
    const { post, writes } = setup()
    assert.equal((await post({ ...validBody(), ...changes })).status, 400)
    assert.equal(writes.length, 0)
  }
})
test('rejects missing configuration safely', async () => {
  const { post, writes } = setup({ missingKey: true })
  assert.equal((await post(validBody())).status, 503)
  assert.equal(writes.length, 0)
})
test('rejects changed, zero-priced, inactive or unavailable products', async () => {
  for (const product of [{ price: 0 }, { price: 150 }, { is_active: false }, { is_available_for_delivery: false }, { categories: null },
    { categories: { is_active: false, is_available_for_delivery: true } }]) {
    const { post, writes } = setup({ product })
    assert.equal((await post(validBody())).status, 409)
    assert.equal(writes.length, 0)
  }
})
test('removes only the newly created order if item insertion fails', async () => {
  const { post, writes } = setup({ itemsError: { message: 'QA failure' } })
  assert.equal((await post(validBody())).status, 500)
  assert.equal(writes[2].table, 'orders')
  assert.equal(writes[2].deleted, 'order-qa')
})
test('catalog or order failures do not claim success', async () => {
  for (const options of [{ catalogError: { message: 'QA' } }, { orderError: { message: 'QA' } }]) {
    const { post } = setup(options)
    assert.equal((await post(validBody())).status, 500)
  }
})
