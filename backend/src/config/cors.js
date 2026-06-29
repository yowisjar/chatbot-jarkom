/**
 * CORS untuk localhost, Vercel preview/production, dan origin tambahan dari FRONTEND_URL.
 * FRONTEND_URL dapat berisi beberapa origin dipisah koma, mis:
 * http://localhost:3000,https://netbot-xxx.vercel.app
 */
const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const parseFrontendUrls = () => {
  if (!process.env.FRONTEND_URL) return [];
  return process.env.FRONTEND_URL
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const allowed = [...STATIC_ALLOWED_ORIGINS, ...parseFrontendUrls()];
  if (allowed.includes(origin)) return true;

  // Vercel production & preview: https://<project>-<hash>.vercel.app
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
    } else {
      console.warn('[CORS] Origin ditolak:', origin);
      callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
};

module.exports = { corsOptions, isAllowedOrigin };
