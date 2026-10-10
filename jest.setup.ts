import "@testing-library/jest-dom";

// jsdom implements neither scroll method.
Element.prototype.scrollIntoView = jest.fn();
Element.prototype.scrollTo = jest.fn();

// useHeightVar observes elements; jsdom has no ResizeObserver.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// useAppHeight reads window.visualViewport.
Object.defineProperty(window, "visualViewport", {
  writable: true,
  configurable: true,
  value: {
    height: 800,
    width: 400,
    offsetTop: 0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

// jsdom doesn't implement matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
