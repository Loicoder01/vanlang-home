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

// PHA 23 — Profile + Rankings read-only (mock, no DB migration yet)
// Khi DATA_MODE=api và có VANLANG_DB_*, sẽ đọc v1_character/v1_account read-only (SELECT only)
app.get('/api/profile', (req,res)=>{
  const id = req.cookies?.vanlang_session;
  if(!id) return res.status(401).json({ error:'UNAUTHORIZED' });
  // Mock: trả account + main character demo
  const acc = [...mockAccounts.values()].find(a=>String(a.id)===String(id));
  if(!acc) return res.status(401).json({ error:'UNAUTHORIZED' });
  res.json({
    account_id: acc.id, username: acc.username,
    characters: [
      { charId:'char_axe_1', name:'Lạc Vệ Phong', level:35, classId:'axe', power:4820, rank:128 },
      { charId:'char_bow_1', name:'Vân Ưng', level:28, classId:'bow', power:3610, rank:412 },
    ],
    _note: 'DEMO DATA — read-only, sẽ lấy từ v1_character khi DATA_MODE=api'
  });
});
app.get('/api/rankings', (req,res)=>{
  const tab = req.query.tab || 'topLevel';
  const mock = {
    topLevel: [
      {rank:1,name:'Hùng Vương',className:'Lạc Vệ',level:50,value:50},
      {rank:2,name:'Sơn Tinh',className:'Trúc Vệ',level:48,value:48},
      {rank:3,name:'Vân Ưng',className:'Lạc Vũ',level:47,value:47},
      {rank:4,name:'Lạc Long',className:'Lạc Vệ',level:45,value:45},
      {rank:5,name:'Âu Cơ',className:'Lạc Vũ',level:44,value:44},
    ]
  };
  res.json({ tab, items: mock.topLevel||[], _note:'DEMO DATA' });
});

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

// PHA 22 — launch ticket: in-memory (staging), TTL 45s, single-use, no DB migration
import crypto from 'crypto';
const tickets = new Map(); // ticket -> {account_id, expiresAt}
function issueTicket(account_id){
  const ticket = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + 45_000;
  tickets.set(ticket, { account_id, expiresAt });
  setTimeout(()=> tickets.delete(ticket), 50_000);
  return { ticket, expiresAt };
}

app.get('/auth/launch-ticket', (req,res)=>{
  const id = req.cookies?.vanlang_session;
  if(!id) return res.status(401).json({ error:'UNAUTHORIZED' });
  const t = issueTicket(String(id));
  res.json({ ticket: t.ticket, expiresAt: t.expiresAt, account_id: String(id) });
});
app.post('/auth/verify-ticket', (req,res)=>{
  const { ticket } = req.body || {};
  if(!ticket) return res.status(400).json({ error:'VALIDATION_ERROR' });
  const rec = tickets.get(String(ticket));
  if(!rec) return res.status(401).json({ error:'INVALID_TICKET' });
  if(Date.now() > rec.expiresAt){ tickets.delete(String(ticket)); return res.status(401).json({ error:'EXPIRED' }); }
  tickets.delete(String(ticket));
  res.json({ ok:true, account_id: rec.account_id });
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
