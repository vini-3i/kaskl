import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: false });
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import crypto from 'crypto';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3001);
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const jwtSecret = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';
if (process.env.NODE_ENV === 'production' && jwtSecret === 'troque-este-segredo-em-producao') {
  throw new Error('JWT_SECRET obrigatório em produção.');
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin, credentials: true, methods: ['GET','POST','PUT','DELETE'] }));
app.use(compression());
app.use(express.json({ limit: '700kb' }));
app.use(morgan('tiny'));
app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false }));

const authLimiter = rateLimit({ windowMs: 60_000, limit: 80, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Muitas tentativas. Aguarde alguns segundos e tente novamente.' } });
const loginLimiter = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Muitas tentativas de login. Aguarde 1 minuto.' } });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

function requireSupabase(res: express.Response){
  if(!supabase){
    res.status(500).json({ message: 'Supabase não configurado. Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.' });
    return false;
  }
  return true;
}

const moneyInput = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    if (cleaned === '') return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().positive().max(999999));

const urlInput = z.string().trim().url().max(600).refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'URL inválida');
const dateInput = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  }
  return v;
}, z.string().datetime());

// Cadastro flexível: apenas nome, categoria e checkout são obrigatórios.
// Os demais campos podem ficar vazios e o backend cria textos seguros de fallback.
const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9-]+$/).optional().or(z.literal('')),
  category: z.string().trim().min(2).max(60),
  short_description: z.string().trim().max(500).optional().or(z.literal('')),
  description: z.string().trim().max(10000).optional().or(z.literal('')),
  image_url: urlInput.optional().or(z.literal('')),
  old_price: moneyInput.optional().nullable(),
  price: moneyInput.optional().nullable(),
  checkout_url: urlInput,
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  badge: z.string().trim().max(40).optional().or(z.literal('')),
  scheduled_at: dateInput.optional().nullable().or(z.literal(''))
});
const loginSchema = z.object({ email:z.string().email().max(160), password:z.string().min(8).max(200), challenge:z.string().regex(/^\d{6}$/) });
const resetSchema = z.object({ newPassword:z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) });

type AdminRow = { id:string; email:string; password_hash:string; must_change_password:boolean; active:boolean; updated_at?:string };
type JwtPayload = { role:'admin'; adminId:string; email:string; mustChangePassword:boolean };

const loginChallenges = new Map<string, { challengeHash:string; expiresAt:number; ip:string; ua:string; used:boolean }>();
function cleanSlug(value:string){ return slugify(value, { lower:true, strict:true, trim:true }); }
function clientIp(req:express.Request){ return String(req.ip || req.socket.remoteAddress || 'unknown'); }
function userAgent(req:express.Request){ return String(req.headers['user-agent'] || 'unknown').slice(0,180); }
function signAdmin(admin: AdminRow){ return jwt.sign({ role:'admin', adminId:admin.id, email:admin.email, mustChangePassword:admin.must_change_password } satisfies JwtPayload, jwtSecret, { expiresIn:'2h' }); }

function readCookie(req: express.Request, name: string){
  const raw = String(req.headers.cookie || '');
  const found = raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}
function visitorId(req: express.Request, res: express.Response){
  let id = readCookie(req, 'kaskl_vid');
  if(!/^[a-f0-9-]{36}$/i.test(id)){
    id = crypto.randomUUID();
    res.cookie('kaskl_vid', id, { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*24*365 });
  }
  return id;
}
function visitorHash(req: express.Request, res: express.Response){
  const base = `${visitorId(req,res)}|${clientIp(req)}|${userAgent(req)}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}
async function getAdminByEmail(email:string){
  if(!supabase) return null;
  const { data, error } = await supabase.from('admin_users').select('*').ilike('email', email).eq('active', true).maybeSingle();
  if(error) throw new Error(error.message);
  return data as AdminRow | null;
}
async function getAdminById(id:string){
  if(!supabase) return null;
  const { data, error } = await supabase.from('admin_users').select('*').eq('id', id).eq('active', true).maybeSingle();
  if(error) throw new Error(error.message);
  return data as AdminRow | null;
}
async function auth(req: express.Request, res: express.Response, next: express.NextFunction){
  if(!requireSupabase(res)) return;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if(!token) return res.status(401).json({message:'Token ausente'});
  try {
    const data = jwt.verify(token, jwtSecret) as JwtPayload;
    if(data.role !== 'admin' || !data.adminId) return res.status(403).json({message:'Acesso negado'});
    const admin = await getAdminById(data.adminId);
    if(!admin) return res.status(401).json({message:'Administrador não encontrado ou inativo'});
    (req as any).admin = admin;
    next();
  } catch { return res.status(401).json({message:'Token inválido ou expirado'}); }
}
function requirePasswordChanged(req: express.Request, res: express.Response, next: express.NextFunction){
  const admin = (req as any).admin as AdminRow;
  if(admin?.must_change_password) return res.status(403).json({message:'Troca de senha obrigatória', code:'PASSWORD_CHANGE_REQUIRED'});
  next();
}
function newChallenge(req:express.Request){
  const token = String(crypto.randomInt(100000, 999999));
  const id = crypto.randomUUID();
  loginChallenges.set(id, { challengeHash: bcrypt.hashSync(token, 10), expiresAt: Date.now()+10_000, ip: clientIp(req), ua: userAgent(req), used:false });
  for(const [k,v] of loginChallenges) if(v.expiresAt < Date.now()-60_000 || v.used) loginChallenges.delete(k);
  return { id, token, expiresInSeconds: 10 };
}
function verifyChallenge(req:express.Request, challenge:string){
  for(const [id, row] of loginChallenges){
    if(row.used || row.expiresAt < Date.now()) continue;
    if(row.ip !== clientIp(req) || row.ua !== userAgent(req)) continue;
    if(bcrypt.compareSync(challenge, row.challengeHash)){ row.used = true; loginChallenges.delete(id); return true; }
  }
  return false;
}
async function addChangelog(type:string,title:string,description:string,productId?:string|null){
  if(!supabase) return;
  await supabase.from('changelog').insert({ type, title, description, product_id: productId || null });
}
const asyncRoute = (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise.resolve(fn(req,res,next)).catch(next);
function publicProductFields(){ return 'id,name,slug,category,short_description,description,image_url,old_price,price,checkout_url,active,featured,badge,scheduled_at,views,clicks,checkout_clicks,created_at,updated_at'; }
function scoreProduct(p:any){ const views=Number(p.views||0), checkout=Number(p.checkout_clicks||0); const ctr=views?checkout/views:0; if(checkout>=20 || ctr>=0.12) return 'quente'; if(checkout>=5 || ctr>=0.04) return 'promissor'; if(views>=20 && checkout===0) return 'atenção'; return 'novo'; }
async function audit(admin:any, action:string, entity:string, entityId?:string|null, metadata:any={}){ if(!supabase) return; await supabase.from('admin_audit_logs').insert({ admin_id: admin?.id || null, action, entity, entity_id: entityId || null, metadata, ip: metadata.ip || null, user_agent: metadata.user_agent || null }); }
async function logApp(level:string,message:string,context:any={}){ if(!supabase) return; try { await supabase.from('app_logs').insert({ level, message, context }); } catch {} }
function normalizeUtm(v:any){ const s=String(v||'direto').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,50); return s || 'direto'; }
function sanitizeSearch(value:any){ return String(value || '').normalize('NFKC').replace(/[\%(),:*]/g, ' ').replace(/[^\p{L}\p{N}\s._-]/gu, '').trim().slice(0,80); }
function fallbackShort(name:string, category:string){ return `${name} disponível na Kaskl em ${category}. Confira detalhes e acesse o checkout seguro.`.slice(0,180); }
function fallbackDescription(name:string){ return `Produto cadastrado na Kaskl. Revise as informações da oferta e finalize a compra pelo checkout externo seguro.\n\n${name}`; }
function normalizeProductPayload(payload:any){
  const name = String(payload.name || '').trim();
  const category = String(payload.category || 'Ofertas').trim();
  const slug = cleanSlug(payload.slug || name);
  return {
    ...payload,
    name,
    category,
    slug,
    short_description: String(payload.short_description || '').trim() || fallbackShort(name, category),
    description: String(payload.description || '').trim() || fallbackDescription(name),
    image_url: payload.image_url || null,
    old_price: payload.old_price || null,
    price: payload.price || null,
    badge: payload.badge || null,
    scheduled_at: payload.scheduled_at || null
  };
}

app.get('/api/health', (_,res)=>res.json({ ok:true, database:supabase?'supabase':'not-configured', time:new Date().toISOString() }));
app.get('/api/admin/login-challenge', authLimiter, (req,res)=>res.json(newChallenge(req)));

app.get('/api/changelog', asyncRoute(async (_,res)=>{
  if(!requireSupabase(res)) return;
  const { data, error } = await supabase!.from('changelog').select('*').order('created_at',{ascending:false}).limit(20);
  if(error) return res.status(500).json({message:error.message});
  return res.json(data || []);
}));

app.post('/api/auth/login', loginLimiter, asyncRoute(async (req,res)=>{
  if(!requireSupabase(res)) return;
  const parsed = loginSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Dados inválidos'});
  if(!verifyChallenge(req, parsed.data.challenge)) return res.status(401).json({message:'Token de login expirado ou inválido. Gere outro token.'});
  const admin = await getAdminByEmail(parsed.data.email.toLowerCase());
  if(!admin) return res.status(401).json({message:'Credenciais inválidas'});
  const okPass = await bcrypt.compare(parsed.data.password, admin.password_hash);
  if(!okPass) return res.status(401).json({message:'Credenciais inválidas'});
  await supabase!.from('admin_login_audit').insert({ admin_id: admin.id, ip: clientIp(req), user_agent: userAgent(req), success: true });
  return res.json({ token:signAdmin(admin), mustChangePassword:admin.must_change_password });
}));

app.post('/api/auth/change-password', auth, asyncRoute(async (req,res)=>{
  const parsed = resetSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Senha fraca. Use 12+ caracteres com maiúscula, minúscula, número e símbolo.'});
  const admin = (req as any).admin as AdminRow;
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const { data, error } = await supabase!.from('admin_users').update({ password_hash: passwordHash, must_change_password:false, updated_at:new Date().toISOString() }).eq('id', admin.id).select('*').single();
  if(error) return res.status(500).json({message:error.message});
  await addChangelog('maintenance','Segurança atualizada','A senha administrativa inicial foi alterada com sucesso.');
  return res.json({ ok:true, token:signAdmin(data as AdminRow) });
}));

app.get('/api/products', asyncRoute(async (req,res)=>{
  if(!requireSupabase(res)) return;
  const q = sanitizeSearch(req.query.q);
  let query = supabase!.from('products').select('*').eq('active',true).or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`).order('created_at',{ascending:false});
  if(q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,short_description.ilike.%${q}%`);
  const {data,error}=await query;
  if(error) return res.status(500).json({message:error.message});
  return res.json(data || []);
}));


app.get('/api/admin/dashboard', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { data, error } = await supabase!.from('products').select(publicProductFields()).order('created_at',{ascending:false});
  if(error) return res.status(500).json({message:error.message});
  const products = data || [];
  const totals = products.reduce((acc:any,p:any)=>{
    acc.products += 1;
    if(p.active) acc.active += 1; else acc.inactive += 1;
    acc.views += Number(p.views||0);
    acc.clicks += Number(p.clicks||0);
    acc.checkoutClicks += Number(p.checkout_clicks||0);
    acc.revenueIntent += Number(p.checkout_clicks||0) * Number(p.price||0);
    return acc;
  }, {products:0,active:0,inactive:0,views:0,clicks:0,checkoutClicks:0,revenueIntent:0});
  const topViews = [...products].sort((a:any,b:any)=>(b.views||0)-(a.views||0)).slice(0,5);
  const topClicks = [...products].sort((a:any,b:any)=>((b.checkout_clicks||0)-(a.checkout_clicks||0))).slice(0,5);
  const lowPerformance = [...products].filter((p:any)=>p.active && Number(p.views||0) > 0 && Number(p.checkout_clicks||0) === 0).slice(0,5);
  const { data: activity } = await supabase!.from('changelog').select('*').order('created_at',{ascending:false}).limit(8);
  const scored = products.map((p:any)=>({...p, score:scoreProduct(p)}));
  const sourceRows = await supabase!.from('product_events').select('utm_source,event_type,created_at').gte('created_at', new Date(Date.now()-1000*60*60*24*30).toISOString()).limit(5000);
  const traffic = Object.values((sourceRows.data||[]).reduce((acc:any,e:any)=>{ const k=e.utm_source||'direto'; acc[k]=acc[k]||{source:k,views:0,checkout:0}; if(e.event_type==='view') acc[k].views++; if(e.event_type==='checkout_click') acc[k].checkout++; return acc; },{})).sort((a:any,b:any)=>(b.checkout+b.views)-(a.checkout+a.views));
  return res.json({ totals, topViews:scored.sort((a:any,b:any)=>(b.views||0)-(a.views||0)).slice(0,5), topClicks:scored.sort((a:any,b:any)=>((b.checkout_clicks||0)-(a.checkout_clicks||0))).slice(0,5), lowPerformance, recent: scored.slice(0,5), activity: activity || [], traffic });
}));

app.get('/api/admin/products', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const {data,error}=await supabase!.from('products').select('*').order('created_at',{ascending:false});
  if(error) return res.status(500).json({message:error.message});
  return res.json(data || []);
}));

app.get('/api/products/:slug', asyncRoute(async (req,res)=>{
  if(!requireSupabase(res)) return;
  const slug = cleanSlug(req.params.slug);
  const {data,error}=await supabase!.from('products').select('*').eq('slug',slug).eq('active',true).or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`).maybeSingle();
  if(error) return res.status(500).json({message:error.message});
  if(!data) return res.status(404).json({message:'Produto não encontrado'});

  const vhash = visitorHash(req, res);
  const { data: counted, error: rpcError } = await supabase!.rpc('record_product_view', {
    p_product_id: data.id,
    p_visitor_hash: vhash,
    p_ip: clientIp(req),
    p_user_agent: userAgent(req),
    p_utm_source: normalizeUtm(req.query.utm || req.body?.utm_source)
  });

  let views = Number(data.views || 0);
  if(rpcError){
    // Fallback compatível caso a função ainda não tenha sido criada no SQL Editor.
    const { error: eventError } = await supabase!.from('product_events').insert({ product_id:data.id, event_type:'view', visitor_hash:vhash, ip:clientIp(req), user_agent:userAgent(req), utm_source: normalizeUtm(req.query.utm || req.body?.utm_source) });
    if(!eventError){
      views += 1;
      await supabase!.from('products').update({views}).eq('id',data.id);
    } else if(!String(eventError.message || '').toLowerCase().includes('duplicate')) {
      console.warn('Erro ao registrar visualização única:', eventError.message);
    }
  } else if(counted === true){
    views += 1;
  }
  return res.json({...data, views});
}));

app.post('/api/products/:slug/click', asyncRoute(async (req,res)=>{
  if(!requireSupabase(res)) return;
  const slug = cleanSlug(req.params.slug);
  const {data,error}=await supabase!.from('products').select('id,clicks,checkout_clicks').eq('slug',slug).eq('active',true).maybeSingle();
  if(error) return res.status(500).json({message:error.message});
  if(data){
    const { error: rpcError } = await supabase!.rpc('record_product_checkout_click', {
      p_product_id: data.id,
      p_visitor_hash: visitorHash(req,res),
      p_ip: clientIp(req),
      p_user_agent: userAgent(req),
      p_utm_source: normalizeUtm(req.query.utm || req.body?.utm_source)
    });
    if(rpcError){
      await supabase!.from('product_events').insert({ product_id:data.id, event_type:'checkout_click', visitor_hash:visitorHash(req,res), ip:clientIp(req), user_agent:userAgent(req), utm_source: normalizeUtm(req.query.utm || req.body?.utm_source) });
      await supabase!.from('products').update({
        clicks:Number(data.clicks||0)+1,
        checkout_clicks:Number(data.checkout_clicks||0)+1
      }).eq('id',data.id);
    }
  }
  return res.json({ok:true});
}));

app.post('/api/admin/products', auth, requirePasswordChanged, asyncRoute(async (req,res)=>{
  const parsed = productSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Dados inválidos. Verifique nome, categoria, links, preços e tamanho das descrições.',issues:parsed.error.flatten()});
  const payload = normalizeProductPayload(parsed.data);
  const { data, error } = await supabase!.from('products').insert(payload).select('*').single();
  if(error) return res.status(400).json({message:error.message});
  await addChangelog('product','Novo produto disponível',`${data.name} foi publicado na loja.`, data.id);
  await audit((req as any).admin, 'create', 'product', data.id, {name:data.name});
  return res.status(201).json(data);
}));

app.put('/api/admin/products/:id', auth, requirePasswordChanged, asyncRoute(async (req,res)=>{
  const parsed = productSchema.partial().safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Dados inválidos. Verifique nome, categoria, links, preços e tamanho das descrições.',issues:parsed.error.flatten()});
  const payload:any = { ...parsed.data, updated_at:new Date().toISOString() };
  if(payload.name || payload.category || payload.slug) {
    const baseName = payload.name || 'produto';
    if(payload.slug) payload.slug = cleanSlug(payload.slug);
    else if(payload.name) payload.slug = cleanSlug(baseName);
  }
  if(payload.short_description === '') delete payload.short_description;
  if(payload.description === '') delete payload.description;
  if(payload.image_url === '') payload.image_url = null;
  if(payload.old_price === '' || payload.old_price === undefined) payload.old_price = null;
  if(payload.price === '' || payload.price === undefined) payload.price = null;
  if(payload.badge === '') payload.badge = null;
  if(payload.scheduled_at === '') payload.scheduled_at = null;
  const { data, error } = await supabase!.from('products').update(payload).eq('id', req.params.id).select('*').single();
  if(error) return res.status(400).json({message:error.message});
  await addChangelog('update','Produto atualizado',`${data.name} recebeu atualização de informações.`, data.id);
  await audit((req as any).admin, 'update', 'product', data.id, {name:data.name});
  return res.json(data);
}));

app.delete('/api/admin/products/:id', auth, requirePasswordChanged, asyncRoute(async (req,res)=>{
  const { error } = await supabase!.from('products').delete().eq('id', req.params.id);
  if(error) return res.status(400).json({message:error.message});
  await addChangelog('maintenance','Produto removido','Um produto foi removido do catálogo.');
  await audit((req as any).admin, 'delete', 'product', req.params.id, {});
  return res.json({ok:true});
}));


app.get('/api/admin/notifications', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { data, error } = await supabase!.from('notifications').select('*').order('created_at',{ascending:false}).limit(50);
  if(error) return res.status(500).json({message:error.message});
  return res.json(data||[]);
}));
app.post('/api/admin/notifications/:id/read', auth, requirePasswordChanged, asyncRoute(async (req,res)=>{
  const { error } = await supabase!.from('notifications').update({read:true}).eq('id', req.params.id);
  if(error) return res.status(400).json({message:error.message});
  return res.json({ok:true});
}));
app.get('/api/admin/audit', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { data, error } = await supabase!.from('admin_audit_logs').select('*').order('created_at',{ascending:false}).limit(100);
  if(error) return res.status(500).json({message:error.message});
  return res.json(data||[]);
}));
app.get('/api/admin/logs', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { data, error } = await supabase!.from('app_logs').select('*').order('created_at',{ascending:false}).limit(100);
  if(error) return res.status(500).json({message:error.message});
  return res.json(data||[]);
}));
app.get('/api/admin/export/products.json', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { data, error } = await supabase!.from('products').select('*').order('created_at',{ascending:false});
  if(error) return res.status(500).json({message:error.message});
  res.setHeader('Content-Disposition','attachment; filename="kaskl-produtos.json"');
  return res.json({ exported_at:new Date().toISOString(), products:data||[] });
}));
app.get('/api/admin/export/products.csv', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { data, error } = await supabase!.from('products').select('*').order('created_at',{ascending:false});
  if(error) return res.status(500).json({message:error.message});
  const rows = data || [];
  const cols = ['id','name','slug','category','price','old_price','active','featured','badge','scheduled_at','views','clicks','checkout_clicks','checkout_url','created_at'];
  const esc = (v:any)=> '"' + String(v ?? '').replace(/"/g,'""') + '"';
  const csv = [cols.join(','), ...rows.map((r:any)=>cols.map(c=>esc(r[c])).join(','))].join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="kaskl-produtos.csv"');
  return res.send(csv);
}));
app.get('/api/settings/pixels', asyncRoute(async (_,res)=>{
  if(!requireSupabase(res)) return;
  const { data } = await supabase!.from('app_settings').select('value').eq('key','pixels').maybeSingle();
  return res.json(data?.value || { meta_pixel:'', google_tag_manager:'', google_analytics:'', tiktok_pixel:'' });
}));
app.put('/api/admin/settings/pixels', auth, requirePasswordChanged, asyncRoute(async (req,res)=>{
  const schema = z.object({ meta_pixel:z.string().max(80).optional().or(z.literal('')), google_tag_manager:z.string().max(80).optional().or(z.literal('')), google_analytics:z.string().max(80).optional().or(z.literal('')), tiktok_pixel:z.string().max(80).optional().or(z.literal('')) });
  const parsed = schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Dados inválidos'});
  const { error } = await supabase!.from('app_settings').upsert({key:'pixels', value:parsed.data, updated_at:new Date().toISOString()});
  if(error) return res.status(500).json({message:error.message});
  await audit((req as any).admin, 'update', 'settings_pixels', null, parsed.data);
  return res.json({ok:true, value:parsed.data});
}));
app.post('/api/admin/product-intelligence', auth, requirePasswordChanged, asyncRoute(async (req,res)=>{
  const schema = z.object({ checkout_url:urlInput, name:z.string().max(120).optional().or(z.literal('')), category:z.string().max(60).optional().or(z.literal('')) });
  const parsed = schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Informe um link de checkout válido.'});
  const url = new URL(parsed.data.checkout_url);
  const rawName = parsed.data.name || url.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g,' ') || 'Produto Kaskl';
  const name = rawName.replace(/\b\w/g, c => c.toUpperCase()).slice(0,120);
  const category = parsed.data.category || (/(projetor|fone|carregador|smart|led|hdmi|usb)/i.test(name) ? 'Eletrônicos' : 'Ofertas');
  let old_price:any = '';
  let price:any = '';
  let image_url = '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), 5000);
    const html = await fetch(parsed.data.checkout_url, {signal:ctrl.signal, headers:{'user-agent':'KasklBot/1.0'}}).then(r=>r.text());
    clearTimeout(timer);
    image_url = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] || '';
    const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] || html.match(/<title>([^<]+)/i)?.[1] || '';
    const foundPrice = html.match(/R\$\s*([0-9\.]+,[0-9]{2})/i)?.[1];
    if(foundPrice) price = foundPrice;
    if(title && !parsed.data.name) {
      // safe assignment below via generated variable
    }
  } catch {}
  const short_description = `${name} com oferta especial disponível na Kaskl. Confira detalhes, preço e compre pelo checkout seguro.`;
  const description = `Oferta selecionada da Kaskl.\n\n${name} é uma oportunidade cadastrada para divulgação com checkout externo. Revise as informações do produto, ajuste descrição, imagens e preço antes de publicar.\n\nDica: use UTM nos links de divulgação para acompanhar quais canais geram mais cliques.`;
  return res.json({ name, slug: cleanSlug(name), category, short_description, description, image_url, price, old_price, badge:'Oferta', featured:true, scheduled_at:null });
}));

app.post('/api/admin/resync-metrics', auth, requirePasswordChanged, asyncRoute(async (_,res)=>{
  const { error } = await supabase!.rpc('resync_product_metrics');
  if(error) return res.status(500).json({message:error.message});
  await addChangelog('maintenance','Métricas sincronizadas','As visualizações e cliques foram recalculados com base nos eventos registrados.');
  return res.json({ok:true});
}));

app.use((err:any, _req:express.Request, res:express.Response, _next:express.NextFunction)=>{
  console.error('Erro interno:', err?.message || err);
  logApp('error', err?.message || 'Erro interno', {stack:err?.stack?.slice(0,800)});
  return res.status(500).json({message:'Erro interno no servidor. Verifique os logs da API.'});
});
app.use((_,res)=>res.status(404).json({message:'Rota não encontrada'}));
app.listen(port,()=>console.log(`API Kaskl rodando em http://localhost:${port}`));
