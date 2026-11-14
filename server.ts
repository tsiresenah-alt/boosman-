import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const PORT = 3000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'Hasamlegacy';
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'bossman-db.json');

interface HistoryEntry {
  type: string;
  amount: number;
  date: string;
}

interface ActiveSub {
  id: number;
  name: string;
  income: number;
  intervalDays: number;
  expiresAt: number;
  nextPayoutAt: number;
}

interface StoredUser {
  name: string;
  phone: string;
  pass: string;
  balance: number;
  referral_code: string;
  referred_by: string | null;
  referral_rewarded: boolean;
  active_sub: ActiveSub | null;
  test_start_time: number;
  history: HistoryEntry[];
  created_at: string;
}

interface StoredRequest {
  id: number;
  type: 'Dépôt' | 'Retrait' | 'Nouvelle Inscription' | 'Rapport de Bug';
  user_phone: string;
  user_name: string;
  amount: number;
  fee?: number;
  net_amount?: number;
  method?: string;
  phone?: string;
  ref?: string;
  comment?: string;
  proof_data_url?: string;
  status: 'En attente' | 'Validé' | 'Refusé' | 'Nouveau Membre';
  viewed: boolean;
  created_at: string;
}

interface StoredMessage {
  id: number;
  user_phone: string;
  user_name: string;
  sender: 'user' | 'admin';
  text: string;
  date: string;
  read: boolean;
}

interface DatabaseSchema {
  users: StoredUser[];
  requests: StoredRequest[];
  messages: StoredMessage[];
  maintenance: {
    sections: {
      deposit: boolean;
      withdraw: boolean;
      referral: boolean;
      history: boolean;
      support: boolean;
    };
    subscriptions: Record<number, boolean>;
  };
  nextRequestId: number;
  nextMessageId: number;
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  requests: [],
  messages: [],
  maintenance: {
    sections: {
      deposit: false,
      withdraw: false,
      referral: false,
      history: false,
      support: false,
    },
    subscriptions: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    },
  },
  nextRequestId: 1,
  nextMessageId: 1,
};

function ensureDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return structuredClone(DEFAULT_DB);
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      users: parsed.users ?? [],
      requests: parsed.requests ?? [],
      messages: parsed.messages ?? [],
      maintenance: {
        sections: {
          deposit: parsed.maintenance?.sections?.deposit ?? false,
          withdraw: parsed.maintenance?.sections?.withdraw ?? false,
          referral: parsed.maintenance?.sections?.referral ?? false,
          history: parsed.maintenance?.sections?.history ?? false,
          support: parsed.maintenance?.sections?.support ?? false,
        },
        subscriptions: {
          1: parsed.maintenance?.subscriptions?.[1] ?? false,
          2: parsed.maintenance?.subscriptions?.[2] ?? false,
          3: parsed.maintenance?.subscriptions?.[3] ?? false,
          4: parsed.maintenance?.subscriptions?.[4] ?? false,
          5: parsed.maintenance?.subscriptions?.[5] ?? false,
        },
      },
      nextRequestId: parsed.nextRequestId ?? 1,
      nextMessageId: parsed.nextMessageId ?? 1,
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

function sanitizeUser(user: StoredUser) {
  const { pass: _pass, ...safe } = user;
  return safe;
}

function processPendingPayouts(db: DatabaseSchema, user: StoredUser): boolean {
  if (!user.active_sub) return false;
  let changed = false;
  const now = Date.now();
  const intervalMs = (user.active_sub.intervalDays || 2) * 86400000;

  while (
    user.active_sub &&
    now >= user.active_sub.nextPayoutAt &&
    user.active_sub.nextPayoutAt <= user.active_sub.expiresAt
  ) {
    user.balance += user.active_sub.income;
    user.history.push({
      type: `Revenu ${user.active_sub.name}`,
      amount: user.active_sub.income,
      date: new Date(user.active_sub.nextPayoutAt).toLocaleString('fr-FR'),
    });
    user.active_sub.nextPayoutAt += intervalMs;
    changed = true;
  }

  if (user.active_sub && now >= user.active_sub.expiresAt) {
    user.history.push({
      type: `Fin ${user.active_sub.name}`,
      amount: 0,
      date: new Date(user.active_sub.expiresAt).toLocaleString('fr-FR'),
    });
    user.active_sub = null;
    changed = true;
  }

  if (changed) {
    saveDb(db);
  }
  return changed;
}

const resetCodes = new Map<string, { code: string; expiresAt: number; verified: boolean }>();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  app.get('/api/state/badges', (req, res) => {
    const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
    const db = ensureDb();
    const unviewedReqCount = db.requests.filter((r) => !r.viewed).length;
    const unreadUserMsgsCount = db.messages.filter((m) => m.sender === 'user' && !m.read).length;
    const userUnreadAdminCount = phone
      ? db.messages.filter((m) => m.user_phone === phone && m.sender === 'admin' && !m.read).length
      : 0;

    res.json({
      adminTotalBadge: unviewedReqCount + unreadUserMsgsCount,
      unviewedRequests: unviewedReqCount,
      unreadSupportMessages: unreadUserMsgsCount,
      userUnreadAdminCount,
      maintenance: db.maintenance,
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, phone, pass, referredBy } = req.body as {
      name?: string;
      phone?: string;
      pass?: string;
      referredBy?: string | null;
    };

    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanPass = pass || '';

    if (!cleanName || !cleanPhone || cleanPass.length < 6) {
      res.status(400).json({ error: 'Veuillez remplir tous les champs (mot de passe 6 caractères minimum).' });
      return;
    }

    const db = ensureDb();
    if (db.users.some((u) => u.phone === cleanPhone)) {
      res.status(409).json({ error: 'Ce numéro de téléphone est déjà enregistré.' });
      return;
    }

    let referralCode = `BOSSMAN-${Math.floor(10 + Math.random() * 90)}`;
    while (db.users.some((u) => u.referral_code === referralCode)) {
      referralCode = `BOSSMAN-${Math.floor(100 + Math.random() * 900)}`;
    }

    const nowStr = new Date().toLocaleString('fr-FR');
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const newUser: StoredUser = {
      name: cleanName,
      phone: cleanPhone,
      pass: cleanPass,
      balance: 2000,
      referral_code: referralCode,
      referred_by: referredBy || null,
      referral_rewarded: false,
      active_sub: null,
      test_start_time: Date.now(),
      history: [{ type: 'Bonus inscription', amount: 2000, date: nowStr }],
      created_at: nowStr,
    };

    db.users.push(newUser);
    db.messages.push({
      id: db.nextMessageId++,
      user_phone: cleanPhone,
      user_name: 'Admin',
      sender: 'admin',
      text: `Bienvenue sur BOSSMAN Mada, ${cleanName} ! Votre bonus de bienvenue de 2 000 Ar a été crédité.`,
      date: timeStr,
      read: false,
    });
    db.requests.push({
      id: db.nextRequestId++,
      type: 'Nouvelle Inscription',
      user_name: cleanName,
      user_phone: cleanPhone,
      amount: 0,
      status: 'Nouveau Membre',
      viewed: false,
      created_at: nowStr,
    });

    saveDb(db);
    res.json({ user: sanitizeUser(newUser), maintenance: db.maintenance });
  });

  app.post('/api/auth/login', (req, res) => {
    const { phone, pass } = req.body as { phone?: string; pass?: string };
    const db = ensureDb();
    const user = db.users.find((u) => u.phone === (phone || '').trim() && u.pass === pass);
    if (!user) {
      res.status(401).json({ error: 'Numéro de téléphone ou mot de passe incorrect.' });
      return;
    }
    processPendingPayouts(db, user);
    res.json({ user: sanitizeUser(user), maintenance: db.maintenance });
  });

  app.post('/api/auth/forgot-password/send', (req, res) => {
    const { phone } = req.body as { phone?: string };
    const cleanPhone = (phone || '').trim();
    const db = ensureDb();
    const user = db.users.find((u) => u.phone === cleanPhone);
    if (!user) {
      res.status(404).json({ error: 'Aucun compte trouvé avec ce numéro.' });
      return;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    resetCodes.set(cleanPhone, { code, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });
    res.json({ ok: true, demoCode: code });
  });

  app.post('/api/auth/forgot-password/verify', (req, res) => {
    const { phone, code } = req.body as { phone?: string; code?: string };
    const cleanPhone = (phone || '').trim();
    const entry = resetCodes.get(cleanPhone);
    if (!entry || Date.now() > entry.expiresAt) {
      res.status(400).json({ error: 'Code expiré ou invalide. Veuillez recommencer.' });
      return;
    }
    if (entry.code !== (code || '').trim()) {
      res.status(400).json({ error: 'Code de confirmation incorrect.' });
      return;
    }
    entry.verified = true;
    resetCodes.set(cleanPhone, entry);
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password/reset', (req, res) => {
    const { phone, newPass } = req.body as { phone?: string; newPass?: string };
    const cleanPhone = (phone || '').trim();
    const entry = resetCodes.get(cleanPhone);
    if (!entry || !entry.verified) {
      res.status(403).json({ error: 'Vérification SMS requise avant de changer le mot de passe.' });
      return;
    }
    if (!newPass || newPass.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    const db = ensureDb();
    const user = db.users.find((u) => u.phone === cleanPhone);
    if (!user) {
      res.status(404).json({ error: 'Compte introuvable.' });
      return;
    }
    user.pass = newPass;
    saveDb(db);
    resetCodes.delete(cleanPhone);
    res.json({ ok: true });
  });

  app.get('/api/user/:phone', (req, res) => {
    const db = ensureDb();
    const user = db.users.find((u) => u.phone === req.params.phone);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }
    processPendingPayouts(db, user);
    res.json({ user: sanitizeUser(user), maintenance: db.maintenance });
  });

  app.delete('/api/user/:phone', (req, res) => {
    const db = ensureDb();
    const phone = req.params.phone;
    db.users = db.users.filter((u) => u.phone !== phone);
    db.requests = db.requests.filter((r) => r.user_phone !== phone);
    db.messages = db.messages.filter((m) => m.user_phone !== phone);
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/user/:phone/subscribe', (req, res) => {
    const { planId, price, income, durationDays, intervalDays } = req.body as {
      planId: number;
      price: number;
      income: number;
      durationDays: number;
      intervalDays: number;
    };
    const db = ensureDb();
    if (db.maintenance.subscriptions[planId]) {
      res.status(403).json({ error: 'Cet abonnement est actuellement en maintenance.' });
      return;
    }
    const user = db.users.find((u) => u.phone === req.params.phone);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }
    if (user.balance < price) {
      res.status(400).json({ error: 'Solde insuffisant pour activer cet abonnement.' });
      return;
    }

    user.balance -= price;
    const now = Date.now();
    user.active_sub = {
      id: planId,
      name: `ABONNEMENT ${planId}`,
      income,
      intervalDays,
      expiresAt: now + durationDays * 86400000,
      nextPayoutAt: now + intervalDays * 86400000,
    };
    user.history.push({
      type: `Achat Abonnement ${planId}`,
      amount: -price,
      date: new Date().toLocaleString('fr-FR'),
    });

    if (user.referred_by && !user.referral_rewarded) {
      const referrer = db.users.find((u) => u.referral_code === user.referred_by);
      if (referrer) {
        const bonus = Math.round(price * 0.1);
        referrer.balance += bonus;
        referrer.history.push({
          type: `Commission parrainage (${user.name})`,
          amount: bonus,
          date: new Date().toLocaleString('fr-FR'),
        });
        db.messages.push({
          id: db.nextMessageId++,
          user_phone: referrer.phone,
          user_name: 'Admin',
          sender: 'admin',
          text: `Félicitations ! Votre filleul ${user.name} a souscrit à un abonnement. Vous avez reçu ${bonus.toLocaleString('fr-FR')} Ar de commission.`,
          date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          read: false,
        });
        user.referral_rewarded = true;
      }
    }

    saveDb(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/requests', (req, res) => {
    const body = req.body as {
      type: StoredRequest['type'];
      user_phone: string;
      user_name: string;
      amount?: number;
      method?: string;
      phone?: string;
      ref?: string;
      comment?: string;
      proof_data_url?: string;
      fromSupportChat?: boolean;
    };

    const db = ensureDb();
    const user = db.users.find((u) => u.phone === body.user_phone);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    const amount = Number(body.amount || 0);
    if (body.type === 'Dépôt' && amount < 15000) {
      res.status(400).json({ error: 'Le dépôt minimum est de 15 000 Ar.' });
      return;
    }

    let fee = 0;
    let netAmount = amount;
    if (body.type === 'Retrait') {
      if (amount < 3000) {
        res.status(400).json({ error: 'Le retrait minimum est de 3 000 Ar.' });
        return;
      }
      if (amount > user.balance) {
        res.status(400).json({ error: 'Solde insuffisant pour ce retrait.' });
        return;
      }
      fee = Math.round(amount * 0.1);
      netAmount = amount - fee;
    }

    const newReq: StoredRequest = {
      id: db.nextRequestId++,
      type: body.type,
      user_phone: body.user_phone,
      user_name: body.user_name,
      amount: body.type === 'Rapport de Bug' ? 1000 : amount,
      fee: body.type === 'Retrait' ? fee : undefined,
      net_amount: body.type === 'Retrait' ? netAmount : undefined,
      method: body.method,
      phone: body.phone,
      ref: body.ref,
      comment: body.comment,
      proof_data_url: body.proof_data_url,
      status: 'En attente',
      viewed: false,
      created_at: new Date().toLocaleString('fr-FR'),
    };

    db.requests.push(newReq);

    if (body.fromSupportChat && body.type === 'Dépôt') {
      db.messages.push({
        id: db.nextMessageId++,
        user_phone: body.user_phone,
        user_name: body.user_name,
        sender: 'user',
        text: `[Dépôt] ${amount.toLocaleString('fr-FR')} Ar | Réf : ${body.ref || '-'}`,
        date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      });
    }

    saveDb(db);
    res.json({ request: newReq });
  });

  app.get('/api/messages/:phone', (req, res) => {
    const db = ensureDb();
    const list = db.messages.filter((m) => m.user_phone === req.params.phone);
    res.json({ messages: list });
  });

  app.post('/api/messages', (req, res) => {
    const { user_phone, user_name, sender, text } = req.body as {
      user_phone: string;
      user_name: string;
      sender: 'user' | 'admin';
      text: string;
    };
    if (!text?.trim()) {
      res.status(400).json({ error: 'Message vide.' });
      return;
    }
    const db = ensureDb();
    const msg: StoredMessage = {
      id: db.nextMessageId++,
      user_phone,
      user_name,
      sender,
      text: text.trim(),
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    db.messages.push(msg);
    saveDb(db);
    res.json({ message: msg });
  });

  app.post('/api/messages/read', (req, res) => {
    const { phone, targetSender } = req.body as { phone?: string; targetSender: 'admin' | 'user' };
    const db = ensureDb();
    db.messages.forEach((m) => {
      if (m.sender === targetSender && (!phone || m.user_phone === phone)) {
        m.read = true;
      }
    });
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/login', (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    if (passcode === ADMIN_PASSCODE) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
    }
  });

  app.get('/api/admin/data', (_req, res) => {
    const db = ensureDb();
    let modified = false;
    db.requests.forEach((r) => {
      if (!r.viewed) {
        r.viewed = true;
        modified = true;
      }
    });
    if (modified) saveDb(db);

    res.json({
      users: db.users.map(sanitizeUser),
      requests: [...db.requests].reverse(),
      messages: [...db.messages].reverse(),
      maintenance: db.maintenance,
    });
  });

  app.post('/api/admin/requests/:id/action', (req, res) => {
    const id = Number(req.params.id);
    const { action } = req.body as { action: 'Valider' | 'Refuser' };
    const db = ensureDb();
    const requestItem = db.requests.find((r) => r.id === id);
    if (!requestItem) {
      res.status(404).json({ error: 'Demande introuvable.' });
      return;
    }
    if (requestItem.status !== 'En attente') {
      res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
      return;
    }

    const user = db.users.find((u) => u.phone === requestItem.user_phone);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur associé introuvable.' });
      return;
    }

    const nowStr = new Date().toLocaleString('fr-FR');
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (action === 'Valider') {
      if (requestItem.type === 'Dépôt') {
        user.balance += requestItem.amount;
        user.history.push({ type: 'Dépôt validé', amount: requestItem.amount, date: nowStr });
        db.messages.push({
          id: db.nextMessageId++,
          user_phone: user.phone,
          user_name: 'Admin',
          sender: 'admin',
          text: `Votre dépôt de ${requestItem.amount.toLocaleString('fr-FR')} Ar (Réf: ${requestItem.ref || '-'}) a été validé.`,
          date: timeStr,
          read: false,
        });
      } else if (requestItem.type === 'Retrait') {
        if (user.balance < requestItem.amount) {
          res.status(400).json({ error: "Le solde de l'utilisateur est insuffisant." });
          return;
        }
        user.balance -= requestItem.amount;
        user.history.push({
          type: `Retrait (${requestItem.method || 'Mobile Money'})`,
          amount: -requestItem.amount,
          date: nowStr,
        });
        db.messages.push({
          id: db.nextMessageId++,
          user_phone: user.phone,
          user_name: 'Admin',
          sender: 'admin',
          text: `Votre retrait de ${requestItem.amount.toLocaleString('fr-FR')} Ar (Net reçu : ${(requestItem.net_amount ?? requestItem.amount).toLocaleString('fr-FR')} Ar) a été validé.`,
          date: timeStr,
          read: false,
        });
      } else if (requestItem.type === 'Rapport de Bug') {
        user.balance += 1000;
        user.history.push({ type: 'Récompense Bug validé', amount: 1000, date: nowStr });
        db.messages.push({
          id: db.nextMessageId++,
          user_phone: user.phone,
          user_name: 'Admin',
          sender: 'admin',
          text: 'Merci pour votre signalement ! Votre rapport de bug a été validé et 1 000 Ar ont été crédités sur votre solde.',
          date: timeStr,
          read: false,
        });
      }
      requestItem.status = 'Validé';
    } else {
      requestItem.status = 'Refusé';
      db.messages.push({
        id: db.nextMessageId++,
        user_phone: user.phone,
        user_name: 'Admin',
        sender: 'admin',
        text: `[Demande Refusée] Votre demande (${requestItem.type}) a été refusée par l'administrateur.`,
        date: timeStr,
        read: false,
      });
    }

    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/maintenance', (req, res) => {
    const { category, key, value } = req.body as {
      category: 'sections' | 'subscriptions';
      key: string;
      value: boolean;
    };
    const db = ensureDb();
    if (category === 'sections') {
      const k = key as keyof DatabaseSchema['maintenance']['sections'];
      if (k in db.maintenance.sections) {
        db.maintenance.sections[k] = Boolean(value);
      }
    } else if (category === 'subscriptions') {
      const numKey = Number(key);
      if (!Number.isNaN(numKey)) {
        db.maintenance.subscriptions[numKey] = Boolean(value);
      }
    }
    saveDb(db);
    res.json({ maintenance: db.maintenance });
  });

  app.post('/api/ai-chat', async (req, res) => {
    const { message, lang, userName, balance } = req.body as {
      message?: string;
      lang?: string;
      userName?: string;
      balance?: number;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: 'Message requis.' });
      return;
    }

    if (!ai) {
      const fallback =
        lang === 'mg'
          ? "Salama tsara! Ny fampidirana vola farany ambany dia 15 000 Ar (Orange Money: 0371897870 - Manovo Hasambarana / Airtel Money: 0336181891 - Riantso Soloniaina), ary ny famoahana dia manomboka amin'ny 3 000 Ar (sarany 10%). Mifandraisa amin'ny Support Admin raha mila fanampiana fanampiny."
          : "Bonjour ! Sur BOSSMAN Mada, le dépôt minimum est de 15 000 Ar (Orange Money : 0371897870 Manovo Hasambarana / Airtel Money : 0336181891 Riantso Soloniaina) et le retrait minimum est de 3 000 Ar (frais 10%). N'hésitez pas à contacter le Support Admin si besoin.";
      res.json({ reply: fallback });
      return;
    }

    try {
      const systemInstruction = `Tu es l'Assistant IA officiel de BOSSMAN Mada, une plateforme d'abonnements et de revenus en ligne à Madagascar.
Réponds de façon claire, concise, professionnelle et chaleureuse en français ou en malgache selon la langue de l'utilisateur (langue actuelle de l'interface : ${lang === 'mg' ? 'Malgache' : 'Français'}).
Contexte utilisateur : Nom = ${userName || 'Membre'}, Solde = ${balance ?? 0} Ar.
Règles officielles de BOSSMAN Mada :
- Bonus d'inscription : +2 000 Ar crédités automatiquement.
- Dépôt minimum : 15 000 Ar via Orange Money (0371897870 - Manovo Hasambarana) ou Airtel Money (0336181891 - Riantso Soloniaina), avec référence SMS et capture d'écran.
- Retrait minimum : 3 000 Ar avec 10% de frais de transfert via Orange Money ou Airtel Money.
- Abonnements disponibles :
  1) ABONNEMENT 1 (Débutant) : 15 000 Ar -> 1 000 Ar tous les 2 jours pendant 31 jours.
  2) ABONNEMENT 2 (Standard) : 25 000 Ar -> 1 500 Ar tous les 2 jours pendant 30 jours.
  3) ABONNEMENT 3 (Pro) : 40 000 Ar -> 3 000 Ar tous les 3 jours pendant 25 jours.
  4) ABONNEMENT 4 (VIP BOSS) : 75 000 Ar -> 5 000 Ar tous les 3 jours pendant 31 jours.
  5) ABONNEMENT 5 (VIP Premium) : 90 000 Ar -> 6 000 Ar tous les 4 jours pendant 40 jours.
- Session Test 24h : les nouveaux membres peuvent signaler un bug avec commentaire + capture d'écran pour gagner 1 000 Ar après validation admin.
- Parrainage : code unique BOSSMAN-XX donnant 10% de commission quand un filleul souscrit un abonnement.
Ne jamais inventer de faux numéros de téléphone ou d'autres moyens de paiement.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: message.trim(),
        config: {
          systemInstruction,
        },
      });

      res.json({ reply: response.text || 'Je suis disponible pour vous aider sur BOSSMAN Mada.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur Gemini API';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOSSMAN Mada server listening on http://localhost:${PORT}`);
  });
}

startServer();
