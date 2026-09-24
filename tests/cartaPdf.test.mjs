import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../lib/cartaPdf.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const cartaModule = { exports: {} }
new Function('require', 'module', 'exports', compiled)(require, cartaModule, cartaModule.exports)
const { createCartaPdf } = cartaModule.exports

function makeMenu(productCount) {
  return Array.from({ length: Math.max(1, Math.ceil(productCount / 20)) }, (_, categoryIndex) => ({
    id: `category-${categoryIndex}`,
    name: `Categoría extensa ${categoryIndex + 1}`,
    products: Array.from({ length: Math.min(20, productCount - categoryIndex * 20) }, (_, productIndex) => ({
      id: `product-${categoryIndex}-${productIndex}`,
      name: `Producto de prueba con nombre ${categoryIndex + 1}-${productIndex + 1}`,
      description: 'Descripción suficientemente extensa para ocupar varias líneas en la carta impresa.',
      price: 10000 + productIndex,
    })),
  }))
}

test('always creates a two-page PDF for a small menu', async () => {
  const result = await createCartaPdf(makeMenu(1), 'qa', null)
  assert.equal(result.pageCount, 2)
  assert.equal(result.fileName, 'Carta-qa.pdf')
  assert.ok(result.blob.size > 0)
})

test('automatically compacts a growing menu into two pages', async () => {
  const result = await createCartaPdf(makeMenu(300), 'qa', null)
  assert.equal(result.pageCount, 2)
  assert.ok(result.blob.size > 0)
})
