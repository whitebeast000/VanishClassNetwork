// React Native provides performance.now() at runtime (a monotonic timer),
// but its TypeScript config does not declare it.
declare const performance: { now(): number };