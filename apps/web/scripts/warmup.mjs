const ROUTES = ['/', '/signin', '/repo/vercel/next.js'];

const base = process.env.WARMUP_BASE ?? 'http://localhost:3000';

async function warm(route) {
  const started = Date.now();
  try {
    const response = await fetch(`${base}${route}`);
    console.log(`${route} -> ${response.status} in ${Date.now() - started}ms`);
  } catch (error) {
    console.log(`${route} -> failed: ${error}`);
  }
}

for (const route of ROUTES) {
  await warm(route);
}