/**
 * Next.js Middleware — connects proxy.ts security layer.
 *
 * proxy.ts contains all logic: CSRF validation, IP rate limiting,
 * CSP nonce generation, locale resolution, and auth checks.
 * This file simply wires it into Next.js's middleware system.
 */
export { proxy as middleware, config } from "./proxy";
