// The setup import registers DOM matchers with Vitest before each test file.
// oxlint-disable-next-line import/no-unassigned-import
import "@testing-library/jest-dom/vitest";

// JSDOM omits scrolling; the router invokes it after navigation.
Object.defineProperty(globalThis, "scrollTo", {
    configurable: true,
    value: () => {},
    writable: true,
});
