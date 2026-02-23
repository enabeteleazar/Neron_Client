import express from ‘express’;
import { createServer as createHttpServer } from ‘node:http’;
import { createServer as createHttpsServer } from ‘node:https’;
import { readFileSync, existsSync } from ‘node:fs’;
import path from ‘node:path’;
import { fileURLToPath } from ‘node:url’;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || ‘8080’, 10);

// –– CORS ––
app.use((req, res, next) => {
const allowedOrigins = new Set();
if (process.env.REPLIT_DEV_DOMAIN) allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
if (process.env.REPLIT_DOMAINS) {
process.env.REPLIT_DOMAINS.split(’,’).forEach(d => allowedOrigins.add(`https://${d.trim()}`));
}
const origin = req.headers.origin;
const isLocalhost = origin?.startsWith(‘http://localhost:’) || origin?.startsWith(‘http://127.0.0.1:’);
if (origin && (allowedOrigins.has(origin) || isLocalhost)) {
res.setHeader(‘Access-Control-Allow-Origin’, origin);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, POST, PUT, DELETE, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type, Authorization’);
res.setHeader(‘Access-Control-Allow-Credentials’, ‘true’);
}
if (req.method === ‘OPTIONS’) return res.sendStatus(200);
next();
});

// –– Body parsing ––
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// –– Request logging ––
app.use((req, res, next) => {
const start = Date.now();
res.on(‘finish’, () => {
if (!req.path.startsWith(’/api’)) return;
console.log(`${req.method} ${req.path} ${res.statusCode} — ${Date.now() - start}ms`);
});
next();
});

// –– API routes ––
app.get(’/api/health’, (_req, res) => {
res.json({ status: ‘ok’, timestamp: new Date().toISOString() });
});

app.get(’/api/config’, (_req, res) => {
res.json({
coreUrl: process.env.NERON_CORE_URL || null,
sttUrl:  process.env.NERON_STT_URL  || null,
});
});

// –– Static files ––
const publicDir = path.resolve(__dirname, ‘../public’);
app.use(express.static(publicDir));

// –– SPA fallback ––
app.get(’/{*path}’, (_req, res) => {
res.sendFile(path.join(publicDir, ‘index.html’));
});

// –– Error handler ––
app.use((err, _req, res, _next) => {
const status = err.status || err.statusCode || 500;
console.error(‘Server error:’, err);
res.status(status).json({ error: err.message || ‘Internal Server Error’ });
});

// –– Start : HTTPS si certificats présents, sinon HTTP ––
const certPath = path.resolve(__dirname, ‘../cert.pem’);
const keyPath  = path.resolve(__dirname, ‘../key.pem’);

if (existsSync(certPath) && existsSync(keyPath)) {
const server = createHttpsServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, app);
server.listen({ port: PORT, host: ‘0.0.0.0’ }, () => {
console.log(`🔒 Neron (HTTPS) → https://localhost:${PORT}`);
console.log(`   Réseau local   → https://<ton-ip>:${PORT}`);
console.log(`   ⚠️  Accepter l'avertissement certificat dans le navigateur`);
});
} else {
const server = createHttpServer(app);
server.listen({ port: PORT, host: ‘0.0.0.0’ }, () => {
console.log(`🎙  Neron (HTTP) → http://localhost:${PORT}`);
console.log(`   ⚠️  Certificats manquants — exécuter : npm run gen-cert`);
});
}
