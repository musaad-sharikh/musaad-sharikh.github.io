import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCart } from '../demos/commerce/cart.js';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

test('adding the same product twice increments quantity', () => {
  const cart = createCart(memory());
  cart.add('p1', 1);
  cart.add('p1', 2);
  assert.deepEqual(cart.items(), [{ id: 'p1', qty: 3 }]);
});

test('setting quantity to zero removes the line', () => {
  const cart = createCart(memory());
  cart.add('p1', 2);
  cart.setQty('p1', 0);
  assert.deepEqual(cart.items(), []);
});

test('quantity is clamped to a non-negative integer', () => {
  const cart = createCart(memory());
  cart.add('p1', -5);
  assert.deepEqual(cart.items(), []);
  cart.add('p2', 2.7);
  assert.deepEqual(cart.items(), [{ id: 'p2', qty: 2 }]);
});

test('state survives a reload through storage', () => {
  const storage = memory();
  createCart(storage).add('p1', 4);
  assert.deepEqual(createCart(storage).items(), [{ id: 'p1', qty: 4 }]);
});

test('subscribers are notified on every mutation', () => {
  const cart = createCart(memory());
  let calls = 0;
  cart.subscribe(() => { calls += 1; });
  cart.add('p1', 1);
  cart.setQty('p1', 3);
  cart.remove('p1');
  assert.equal(calls, 3);
});
