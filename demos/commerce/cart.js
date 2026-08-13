// DOM-free cart state: a closure over an array of { id, qty } lines, persisted
// to an injected storage object (any localStorage-shaped { getItem, setItem })
// under the key below as JSON. Storage is optional at the call site (e.g. a
// disabled-storage / private-browsing localStorage) — every access is wrapped
// in try/catch so the cart degrades to in-memory-only rather than throwing.
const STORAGE_KEY = 'commerce:cart';

function clampQty(qty) {
  return Math.max(0, Math.floor(qty));
}

function load(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line) => line && typeof line.id === 'string')
      .map((line) => ({ id: line.id, qty: clampQty(Number(line.qty)) }))
      .filter((line) => line.qty > 0);
  } catch {
    return [];
  }
}

function save(storage, lines) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* non-fatal — the in-memory state is still authoritative for this session */
  }
}

export function createCart(storage) {
  let lines = load(storage);
  const subscribers = new Set();

  function notify() {
    save(storage, lines);
    for (const fn of subscribers) fn();
  }

  function findIndex(id) {
    return lines.findIndex((line) => line.id === id);
  }

  return {
    add(id, qty) {
      const delta = clampQty(qty);
      const index = findIndex(id);
      if (index === -1) {
        if (delta > 0) lines = [...lines, { id, qty: delta }];
      } else {
        lines = lines.map((line, i) => (i === index ? { ...line, qty: line.qty + delta } : line));
      }
      notify();
    },

    setQty(id, qty) {
      const next = clampQty(qty);
      const index = findIndex(id);
      if (index === -1) {
        if (next > 0) lines = [...lines, { id, qty: next }];
        else return; // no line existed and nothing was requested — no-op, no notify
      } else if (next === 0) {
        lines = lines.filter((line) => line.id !== id);
      } else {
        lines = lines.map((line, i) => (i === index ? { ...line, qty: next } : line));
      }
      notify();
    },

    remove(id) {
      lines = lines.filter((line) => line.id !== id);
      notify();
    },

    items() {
      return lines.map((line) => ({ ...line }));
    },

    total() {
      return lines.reduce((sum, line) => sum + line.qty, 0);
    },

    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
