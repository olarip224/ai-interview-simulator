import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver, and always reports 0x0 for
// getBoundingClientRect — Recharts' ResponsiveContainer (used by shadcn's chart
// wrapper) waits for a resize callback with a non-zero size before rendering
// its children, so observe() must actually fire once with a usable size.
class ResizeObserverStub {
  #callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
  }

  observe(target: Element) {
    queueMicrotask(() => {
      this.#callback(
        [{ target, contentRect: { width: 320, height: 200 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver
      )
    })
  }

  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
