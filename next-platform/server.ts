import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';

// y-websocket utils are not typed by default
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '', true);
    
    // Pass HMR requests to Next.js (dev server)
    if (pathname?.startsWith('/_next/webpack-hmr')) {
       // If we don't handle it, the 'upgrade' event might bubble or Next.js handles it internally via a separate listener. 
       // Actually Next.js creates its own server usually, but here we are using a custom one.
       // However, next() app instance doesn't expose the upgrade handler easily for HMR.
       // Usually in custom server dev mode, HMR works if we forward normal requests. 
       // But 'upgrade' for HMR might be tricky. 
       // Solution: Don't consume the socket if it's HMR?
       // Let's assume Next.js attaches its own listener? No, we created the server.
       // We might need to ignore it and hope Next.js attaches?
       // Actually, typical custom server examples don't handle HMR upgrade explicitly. 
       // Let's NOT destroy the socket for /_next/... 
       return; 
    }
    
    if (pathname?.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
        // socket.destroy(); // Don't destroy immediately, maybe other handlers?
    }
  });

  wss.on('connection', (ws, req) => {
    console.log("WS Connection:", req.url);
    setupWSConnection(ws, req);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
