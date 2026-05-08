// Sentry retiré du build mobile — stub no-op pour conserver l'API publique
// utilisée par les autres modules (initSentry, captureException). Tout
// est désactivé jusqu'à ce qu'on remette en place une solution de monitoring
// (Sentry avec credentials propres, Bugsnag, etc.).

export function initSentry(): void {
  // no-op
}

export function captureException(_error: unknown, _context?: Record<string, unknown>): void {
  // no-op
}
