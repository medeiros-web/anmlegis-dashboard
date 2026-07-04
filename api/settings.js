const crypto = require('crypto');
const https  = require('https');

const NEON_CONN  = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'plat-juridico-mineral-2025';

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
          const parsed = JSON.parse(data);
          if (parsed.code || (parsed.message && !parsed.command)) {
            reject(new Error(parsed.message || JSON.stringify(parsed)));
          } else {
            resolve(parsed);
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function verifyJWT(token) {
  try {
    const [h, b, s] = (token || '').split('.');
    if (!h || !b || !s) return null;
    const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest());
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

async function ensureTable() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS plat_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = verifyJWT(token);
  if (!payload || !payload.is_admin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  try {
    await ensureTable();

    // GET — retorna config LLM salva
    if (req.method === 'GET') {
      const result = await dbQuery(
        "SELECT value FROM plat_settings WHERE key = 'llm_config' LIMIT 1"
      );
      const row = result.rows && result.rows[0];
      if (!row) return res.status(200).json({ config: null });
      try {
        return res.status(200).json({ config: JSON.parse(row.value) });
      } catch {
        return res.status(200).json({ config: null });
      }
    }

    // POST — salva config LLM
    if (req.method === 'POST') {
      const { config } = req.body || {};
      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'config inválida.' });
      }
      const value = JSON.stringify(config);
      await dbQuery(
        `INSERT INTO plat_settings (key, value, updated_at)
         VALUES ('llm_config', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [value]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Settings error:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
};
