/*! coi-serviceworker - patched for GitHub Pages subpath deployments
 *  Changes vs v0.1.7:
 *   - Uses COEP: credentialless (GitHub Pages assets don't send CORP headers)
 *   - Skips cross-origin requests entirely (lets them pass through unmodified)
 *   - Fixes catch handler to return a proper Response instead of undefined
 *   - Explicit scope on register() to avoid scope mismatch across deployments
 */

if (typeof window === 'undefined') {
    /* ============================
       SERVICE WORKER SIDE
    ============================ */
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener('fetch', function (event) {
        const req = event.request;

        // Only handle GET requests
        if (req.method !== 'GET') return;

        // Skip the "only-if-cached but not same-origin" case that causes errors
        if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;

        // Only intercept same-origin requests.
        // Cross-origin fetches (CDN assets, HuggingFace, etc.) pass through unmodified
        // so we never trip over missing CORP headers on third-party servers.
        try {
            const url = new URL(req.url);
            if (url.origin !== self.location.origin) return;
        } catch (_) {
            return;
        }

        event.respondWith(
            fetch(req)
                .then((response) => {
                    // Opaque responses (no-cors) cannot have headers mutated
                    if (!response || response.status === 0 || response.type === 'opaque') {
                        return response;
                    }

                    const headers = new Headers(response.headers);

                    // credentialless: subresources don't need CORP opt-in headers.
                    // This is the only mode compatible with GitHub Pages CDN assets.
                    headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
                    headers.set('Cross-Origin-Opener-Policy', 'same-origin');

                    return new Response(response.body, {
                        status:     response.status,
                        statusText: response.statusText,
                        headers,
                    });
                })
                .catch((err) => {
                    // CRITICAL FIX: the original v0.1.7 returned undefined here which
                    // caused respondWith() to throw "encountered an unexpected error".
                    // Instead, serve a minimal network-error response so the browser
                    // falls through gracefully rather than hanging with a blank page.
                    console.warn('[COI-SW] fetch failed, forwarding error response:', err);
                    return new Response('Service Worker fetch error', {
                        status:  503,
                        headers: { 'Content-Type': 'text/plain' },
                    });
                })
        );
    });

} else {
    /* ============================
       MAIN THREAD SIDE
    ============================ */
    (() => {
        // Already cross-origin isolated (e.g. server sends headers natively) — done.
        if (window.crossOriginIsolated !== false) return;

        if (!window.isSecureContext) {
            console.log('[COI] Secure context required — skipping SW registration.');
            return;
        }

        const nav = navigator;
        if (!nav.serviceWorker) return;

        if (nav.serviceWorker.controller) {
            // SW already controls this page — isolation headers are active.
            return;
        }

        const scriptSrc = window.document.currentScript.src;
        // Derive scope from the script URL so it always matches the deployment subpath
        const scope = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);

        nav.serviceWorker.register(scriptSrc, { scope }).then(
            (reg) => {
                console.log('[COI] Service Worker registered, scope:', reg.scope);

                reg.addEventListener('updatefound', () => {
                    console.log('[COI] SW updated — reloading to activate new version.');
                    window.location.reload();
                });

                // SW is installed but not yet controlling — reload to activate it.
                if (reg.active && !nav.serviceWorker.controller) {
                    console.log('[COI] SW active but not controlling — reloading.');
                    window.location.reload();
                }
            },
            (err) => {
                console.error('[COI] Service Worker registration failed:', err);
            }
        );
    })();
}
