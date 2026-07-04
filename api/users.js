const crypto = require('crypto');
const https  = require('https');

const NEON_CONN  = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'plat-juridico-mineral-2025';
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL   = process.env.SITE_URL || 'https://anmlegis-dashboard.vercel.app';
const FROM_EMAIL = 'medeirosassessor.adv@gmail.com';

// ── DB ────────────────────────────────────────────────────────────────────────
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
          // Neon returns error details in the body even on HTTP 200 for some errors
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

// ── JWT verify ────────────────────────────────────────────────────────────────
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

// ── Password hash ─────────────────────────────────────────────────────────────
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plain, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// ── Send invite email via Resend ──────────────────────────────────────────────
function sendInviteEmail(toEmail, toName, tempPassword, invitedBy) {
  return new Promise((resolve) => {
    const emailBody = {
      from: `Plataforma Jurídico-Mineral <onboarding@resend.dev>`,
      to: [toEmail],
      reply_to: FROM_EMAIL,
      subject: 'Acesso à Plataforma Jurídico-Mineral',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f1117;color:#e2e8f0;border-radius:16px;overflow:hidden">
          <div style="background:#1c2230;padding:32px 36px;text-align:center;border-bottom:1px solid #2d3748">
            <div style="font-size:40px;margin-bottom:8px">⛏️</div>
            <h1 style="color:#f59e0b;margin:0;font-size:20px">Plataforma Jurídico-Mineral</h1>
            <p style="color:#8892a4;margin:4px 0 0;font-size:13px">Dashboard Jurídico — Direito Minerário ANM</p>
          </div>
          <div style="padding:32px 36px">
            <p style="margin:0 0 16px">Olá, <strong>${toName}</strong>!</p>
            <p style="margin:0 0 16px;color:#94a3b8">Você foi convidado(a) por <strong style="color:#f59e0b">${invitedBy}</strong> para acessar a Plataforma Jurídico-Mineral.</p>
            <div style="background:#161b22;border:1px solid #2d3748;border-radius:10px;padding:20px;margin:20px 0">
              <p style="margin:0 0 8px;font-size:13px;color:#8892a4">Suas credenciais de acesso:</p>
              <p style="margin:0 0 4px"><span style="color:#8892a4;font-size:12px">E-mail:</span> <strong>${toEmail}</strong></p>
              <p style="margin:0"><span style="color:#8892a4;font-size:12px">Senha temporária:</span> <strong style="color:#f59e0b;font-size:16px">${tempPassword}</strong></p>
            </div>
            <a href="${SITE_URL}" style="display:block;text-align:center;background:#f59e0b;color:#0a0e1a;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:20px 0">Acessar a Plataforma →</a>
            <p style="font-size:12px;color:#4b5563;margin:0">Recomendamos alterar sua senha após o primeiro acesso. Em caso de dúvidas, contate ${FROM_EMAIL}</p>
          </div>
        </div>
      `,
    };

    const body = JSON.stringify(emailBody);
    const opts = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve({ status: 500 }));
    req.write(body);
    req.end();
  });
}

// ── Handler ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify admin token
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = verifyJWT(token);
  if (!payload || !payload.is_admin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  // GET /api/users — list all users
  if (req.method === 'GET') {
    const result = await dbQuery(
      'SELECT id, email, name, is_admin, active, invited_by, created_at FROM plat_users ORDER BY created_at DESC'
    );
    return res.status(200).json({ users: result.rows || [] });
  }

  // POST /api/users — add user
  if (req.method === 'POST') {
    const { email, name, password, sendEmail = true } = req.body || {};
    if (!email || !name) return res.status(400).json({ error: 'E-mail e nome são obrigatórios.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });

    const hash = hashPassword(password);

    try {
      await dbQuery(
        'INSERT INTO plat_users (email, name, password_hash, is_admin, invited_by) VALUES ($1, $2, $3, FALSE, $4)',
        [email.trim().toLowerCase(), name.trim(), hash, payload.sub]
      );
    } catch (err) {
      if (err.message && err.message.includes('unique')) {
        return res.status(409).json({ error: 'E-mail já cadastrado.' });
      }
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
    }

    let emailSent = false;
    if (sendEmail && RESEND_KEY) {
      const r = await sendInviteEmail(email, name, password, payload.sub);
      emailSent = r.status >= 200 && r.status < 300;
    }

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      emailSent,
    });
  }

  // DELETE /api/users — remove or deactivate user
  if (req.method === 'DELETE') {
    const { email, deactivate = false } = req.body || {};
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });
    if (email === payload.sub) return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });

    if (deactivate) {
      await dbQuery('UPDATE plat_users SET active = FALSE WHERE email = $1', [email]);
      return res.status(200).json({ message: 'Usuário desativado.' });
    } else {
      await dbQuery('DELETE FROM plat_users WHERE email = $1 AND is_admin = FALSE', [email]);
      return res.status(200).json({ message: 'Usuário removido.' });
    }
  }

  // PATCH /api/users — reactivate user
  if (req.method === 'PATCH') {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });
    await dbQuery('UPDATE plat_users SET active = TRUE WHERE email = $1', [email]);
    return res.status(200).json({ message: 'Usuário reativado.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
