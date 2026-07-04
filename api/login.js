const crypto = require('crypto');
const https  = require('https');

const NEON_CONN = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'plat-juridico-mineral-2025';

// ── Neon HTTP query ──────────────────────────────────────────────────────────
function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql, params });
    const opts = {
      hostname: 'ep-snowy-bread-acwwqoig.sa-east-1.aws.neon.tech',
      path: '/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': NEON_CONN,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.code || (p.message && !p.command)) reject(new Error(p.message || data));
          else resolve(p);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── JWT (HS256 manual — no deps) ─────────────────────────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function signJWT(payload) {
  const h = b64url('{"alg":"HS256","typ":"JWT"}');
  const b = b64url(JSON.stringify(payload));
  const s = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest());
  return `${h}.${b}.${s}`;
}

// ── Password verify (PBKDF2) ─────────────────────────────────────────────────
function verifyPassword(plain, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(plain, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

// ── Handler ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'E-mail e senha obrigatórios.' });

  try {
    const result = await dbQuery(
      'SELECT id, email, name, password_hash, is_admin, active FROM plat_users WHERE email = $1 LIMIT 1',
      [email.trim().toLowerCase()]
    );

    const user = result.rows && result.rows[0];
    if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    if (!user.active) return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = signJWT({
      sub: user.email,
      name: user.name,
      is_admin: user.is_admin,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    });

    return res.status(200).json({ token, name: user.name, email: user.email, is_admin: user.is_admin });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};
