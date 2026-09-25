// Service worker mínimo de la app instalable: los navegadores lo piden para
// ofrecer "Instalar". No guarda nada en caché a propósito: cada deploy se ve
// al instante y el chat siempre habla con el servidor.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {
  // Sin respondWith: el navegador hace la petición como siempre.
})
