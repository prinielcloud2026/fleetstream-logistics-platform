const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');
const Redis = require('ioredis');

const base = {
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'secret',
  database: 'fleet',
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
};
const writePool = new Pool({ ...base, host: process.env.PG_HOST || 'localhost', port: 5432 });
const readPool = new Pool({ ...base, host: process.env.PG_REPLICA_HOST || 'localhost', port: Number(process.env.PG_REPLICA_PORT) || 5433 });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

fastify.register(require('@fastify/websocket'));

// Home route
fastify.get('/', async () => {
  return { message: 'Welcome to the Logistics Streaming Platform!', status: 'running' };
});

// Health check route
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Save a vehicle location
fastify.post('/vehicles/:id/location', async (req) => {
  const { lat, lng } = req.body;
  const vehicle_id = req.params.id;

  await writePool.query(
    'INSERT INTO locations (vehicle_id, lat, lng) VALUES ($1, $2, $3)',
    [vehicle_id, lat, lng]
  );

  const data = JSON.stringify({ vehicle_id, lat, lng });
  await redis.set(`vehicle:${vehicle_id}`, data, 'EX', 60);
  await redis.publish('locations', data);

  return { ok: true };
});

// Get the latest location (Redis first, then the database)
fastify.get('/vehicles/:id', async (req) => {
  const cached = await redis.get(`vehicle:${req.params.id}`);
  if (cached) return JSON.parse(cached);

  const { rows } = await readPool.query(
    'SELECT * FROM locations WHERE vehicle_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [req.params.id]
  );
  return rows[0] || {};
});

// WebSocket: live tracking
const clients = new Set();
sub.subscribe('locations');
sub.on('message', (_, msg) => {
  clients.forEach((c) => c.send(msg));
});

fastify.register(async (app) => {
  app.get('/track', { websocket: true }, (socket) => {
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
  });
});

// Start server
const start = async () => {
  try {
    await writePool.query(
      'CREATE TABLE IF NOT EXISTS locations(id serial primary key, vehicle_id text, lat double precision, lng double precision, recorded_at timestamptz default now())'
    );
    await fastify.listen({ port: 3000, host: process.env.HOST || '0.0.0.0' });
    console.log('Server running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();