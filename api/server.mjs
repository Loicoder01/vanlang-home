// PHA 21 Auth API — HTTP adapter cho v1_account (read-only audit, no migration)
// DATA_MODE=mock thì dùng memory; khi có DB thật, set VANLANG_DB_HOST/USER/PASS/NAME và DATA_MODE=api
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 8787;
const DATA_MODE = process.env.DATA_MODE || 'mock';
const ALLOW_ORIGINS = (process.env.CORS_ORIGINS || 'https://trangchu.vanlang.biz,https://game.vanlang.biz').split(',').map(s=>s.trim());

// Mock store (khi chưa có DB): dùng cùng shape v1_account
const mockAccounts = new Map(); // username -> {id, username, hash, status}

// Seed 1 account demo (password: demo1234) — chỉ cho local/staging, không log hash
{
  const hash = bcrypt.hashSync('demo1234', 10);
  mockAccounts.set('demo', { id: 10001, username: 'demo', hash, status: 'active' });
}

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin(origin, cb){
  if(!origin || ALLOW_ORIGINS.includes(origin)) cb(null, true);
  else cb(new Error('CORS not allowed'));
}, credentials:true }));

app.use(rateLimit({ windowMs: 60_000, max: 20, standardHeaders:true, legacyHeaders:false }));

app.get('/health', (req,res)=> res.json({ ok:true, dataMode: DATA_MODE }));

app.post('/auth/login', (req,res)=>{
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error:'VALIDATION_ERROR' });
  const acc = mockAccounts.get(String(username));
  if(!acc || !bcrypt.compareSync(String(password), acc.hash)) {
    return res.status(401).json({ error:'INVALID_CREDENTIALS' });
  }
  if(acc.status !== 'active') return res.status(403).json({ error:'ACCOUNT_LOCKED' });
  // HttpOnly Secure cookie — player scope, not Domain=.vanlang.biz wide (spec)
  res.cookie('vanlang_session', String(acc.id), {
    httpOnly:true, secure:true, sameSite:'Lax', path:'/', maxAge: 24*3600*1000
  });
  res.json({ account_id: acc.id, username: acc.username });
});

app.post('/auth/logout', (req,res)=>{
  res.clearCookie('vanlang_session', { httpOnly:true, secure:true, sameSite:'Lax', path:'/' });
  res.json({ ok:true });
});

app.get('/auth/me', (req,res)=>{
  const id = req.cookies?.vanlang_session;
  if(!id) return res.status(401).json({ error:'UNAUTHORIZED' });
  for(const acc of mockAccounts.values()){
    if(String(acc.id)===String(id)) return res.json({ account_id: acc.id, username: acc.username });
  }
  return res.status(401).json({ error:'UNAUTHORIZED' });
});

app.listen(PORT, ()=> console.log('[auth-api] listening', PORT, 'DATA_MODE', DATA_MODE));
