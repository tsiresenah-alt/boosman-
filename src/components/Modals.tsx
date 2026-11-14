import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Copy,
  Share2,
  Send,
  Headset,
  Bot,
  AlertTriangle,
  Trash2,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n';
import type { ChatMessage, Language, User } from '../types';
import { formatAr, playNotificationSound } from '../utils/sound';

export type ActiveModalType =
  | null
  | 'deposit'
  | 'withdraw'
  | 'referral'
  | 'history'
  | 'bug'
  | 'support'
  | 'ai'
  | 'settings';

interface ModalsProps {
  activeModal: ActiveModalType;
  onClose: () => void;
  user: User;
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onRefreshUser: () => Promise<void>;
  onAccountDeleted: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.readAsDataURL(file);
  });
}

export function Modals({
  activeModal,
  onClose,
  user,
  lang,
  onChangeLang,
  onRefreshUser,
  onAccountDeleted,
  notify,
}: ModalsProps) {
  const t = TRANSLATIONS[lang];

  // Deposit state
  const [depAmount, setDepAmount] = useState('');
  const [depPhone, setDepPhone] = useState('');
  const [depRef, setDepRef] = useState('');
  const [depFile, setDepFile] = useState<File | null>(null);
  const [depSubmitting, setDepSubmitting] = useState(false);

  // Withdraw state
  const [witAmount, setWitAmount] = useState('');
  const [witMethod, setWitMethod] = useState<'Orange Money' | 'Airtel Money'>('Orange Money');
  const [witPhone, setWitPhone] = useState('');
  const [witSubmitting, setWitSubmitting] = useState(false);

  // Bug report state
  const [bugComment, setBugComment] = useState('');
  const [bugFile, setBugFile] = useState<File | null>(null);
  const [bugSubmitting, setBugSubmitting] = useState(false);

  // Support chat state
  const [supportTab, setSupportTab] = useState<'chat' | 'deposit'>('chat');
  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [chatDepAmount, setChatDepAmount] = useState('');
  const [chatDepPhone, setChatDepPhone] = useState('');
  const [chatDepRef, setChatDepRef] = useState('');
  const [chatDepFile, setChatDepFile] = useState<File | null>(null);
  const supportEndRef = useRef<HTMLDivElement>(null);

  // AI chat state
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    {
      role: 'ai',
      text:
        lang === 'mg'
          ? "Manao ahoana! Salama tsara. Izaho no mpanampy IA anao eto amin'ny BOSSMAN Mada. Ahoana no ahafahako manampy anao androany?"
          : "Bonjour ! Je suis l'assistant IA de BOSSMAN Mada. Comment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // Settings delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadSupportChat() {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(user.phone)}`);
      const data = await res.json();
      if (res.ok) {
        setSupportMessages(data.messages || []);
      }
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, targetSender: 'admin' }),
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (activeModal === 'support') {
      loadSupportChat();
      const timer = setInterval(loadSupportChat, 5000);
      return () => clearInterval(timer);
    }
    if (activeModal !== 'settings') {
      setConfirmDelete(false);
    }
  }, [activeModal, user.phone]);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages, supportTab]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiLoading]);

  if (!activeModal) return null;

  const parsedWitAmount = parseInt(witAmount || '0', 10) || 0;
  const witFee = Math.round(parsedWitAmount * 0.1);
  const witNet = parsedWitAmount > witFee ? parsedWitAmount - witFee : 0;

  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${user.referral_code}`;

  async function handleDepositSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(depAmount, 10);
    if (!amount || amount < 15000) {
      notify('error', 'Le dépôt minimum est de 15 000 Ar.');
      return;
    }
    if (!depFile) {
      notify('error', "Veuillez joindre une capture d'écran du transfert.");
      return;
    }
    setDepSubmitting(true);
    try {
      const proof = await readFileAsDataUrl(depFile);
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Dépôt',
          user_phone: user.phone,
          user_name: user.name,
          amount,
          phone: depPhone,
          ref: depRef,
          proof_data_url: proof,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Erreur lors de la soumission du dépôt.');
        return;
      }
      playNotificationSound();
      notify('success', 'Dépôt soumis avec succès. En attente de validation admin.');
      setDepAmount('');
      setDepPhone('');
      setDepRef('');
      setDepFile(null);
      onClose();
    } catch {
      notify('error', 'Impossible de soumettre le dépôt.');
    } finally {
      setDepSubmitting(false);
    }
  }

  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(witAmount, 10);
    if (!amount || amount < 3000) {
      notify('error', 'Le retrait minimum est de 3 000 Ar.');
      return;
    }
    if (amount > user.balance) {
      notify('error', 'Solde insuffisant pour ce retrait.');
      return;
    }
    setWitSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Retrait',
          user_phone: user.phone,
          user_name: user.name,
          amount,
          method: witMethod,
          phone: witPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Erreur lors de la demande de retrait.');
        return;
      }
      playNotificationSound();
      notify('success', 'Demande de retrait envoyée avec succès.');
      setWitAmount('');
      setWitPhone('');
      onClose();
    } catch {
      notify('error', 'Impossible de soumettre le retrait.');
    } finally {
      setWitSubmitting(false);
    }
  }

  async function handleBugSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bugComment.trim() || !bugFile) {
      notify('error', "Veuillez décrire le problème et joindre une capture d'écran.");
      return;
    }
    setBugSubmitting(true);
    try {
      const proof = await readFileAsDataUrl(bugFile);
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Rapport de Bug',
          user_phone: user.phone,
          user_name: user.name,
          amount: 1000,
          comment: bugComment.trim(),
          proof_data_url: proof,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Erreur lors de l’envoi du rapport.');
        return;
      }
      playNotificationSound();
      notify('success', 'Rapport envoyé ! Vous recevrez 1 000 Ar après validation admin.');
      setBugComment('');
      setBugFile(null);
      onClose();
    } catch {
      notify('error', 'Impossible d’envoyer le rapport.');
    } finally {
      setBugSubmitting(false);
    }
  }

  async function handleSendSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportInput.trim()) return;
    const text = supportInput.trim();
    setSupportInput('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_phone: user.phone,
          user_name: user.name,
          sender: 'user',
          text,
        }),
      });
      if (res.ok) {
        playNotificationSound();
        await loadSupportChat();
      }
    } catch {
      notify('error', "Impossible d'envoyer le message.");
    }
  }

  async function handleChatDeposit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(chatDepAmount, 10);
    if (!amount || amount < 15000) {
      notify('error', 'Le dépôt minimum est de 15 000 Ar.');
      return;
    }
    if (!chatDepFile) {
      notify('error', "Veuillez joindre une capture d'écran.");
      return;
    }
    setDepSubmitting(true);
    try {
      const proof = await readFileAsDataUrl(chatDepFile);
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Dépôt',
          user_phone: user.phone,
          user_name: user.name,
          amount,
          phone: chatDepPhone,
          ref: chatDepRef,
          proof_data_url: proof,
          fromSupportChat: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Erreur lors du dépôt.');
        return;
      }
      playNotificationSound();
      notify('success', 'Dépôt soumis depuis le support.');
      setChatDepAmount('');
      setChatDepPhone('');
      setChatDepRef('');
      setChatDepFile(null);
      setSupportTab('chat');
      await loadSupportChat();
    } catch {
      notify('error', 'Impossible de soumettre le dépôt.');
    } finally {
      setDepSubmitting(false);
    }
  }

  async function handleSendAi(e: React.FormEvent) {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    const question = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', text: question }]);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          lang,
          userName: user.name,
          balance: user.balance,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: data.error || 'Service momentanément indisponible.' },
        ]);
      } else {
        setAiMessages((prev) => [...prev, { role: 'ai', text: data.reply }]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Erreur de connexion au serveur.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCopyReferral() {
    try {
      await navigator.clipboard.writeText(referralLink);
      notify('success', 'Lien d’invitation copié dans le presse-papier.');
    } catch {
      notify('info', 'Sélectionnez et copiez le lien manuellement.');
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(user.phone)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        notify('error', 'Impossible de supprimer le compte.');
        return;
      }
      notify('success', 'Compte supprimé définitivement.');
      onAccountDeleted();
    } catch {
      notify('error', 'Erreur réseau.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* DEPOSIT MODAL */}
      {activeModal === 'deposit' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-lg text-emerald-400 mb-1">Faire un Dépôt</h3>
          <p className="text-xs text-red-400 font-semibold mb-4">{t.minDepositWithdrawNotice}</p>

          <div className="space-y-2.5 mb-5 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-slate-400">Orange Money</p>
                <p className="font-semibold text-white mt-0.5">Manovo Hasambarana</p>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                0371897870
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-slate-400">Airtel Money</p>
                <p className="font-semibold text-white mt-0.5">Riantso Soloniaina</p>
              </div>
              <span className="font-mono font-bold text-red-400 text-sm tabular-nums">
                0336181891
              </span>
            </div>
          </div>

          <form onSubmit={handleDepositSubmit} className="space-y-3">
            <input
              type="number"
              min={15000}
              value={depAmount}
              onChange={(e) => setDepAmount(e.target.value)}
              placeholder="Montant (ex: 15000)"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <input
              type="tel"
              value={depPhone}
              onChange={(e) => setDepPhone(e.target.value)}
              placeholder="Votre numéro expéditeur"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={depRef}
              onChange={(e) => setDepRef(e.target.value)}
              placeholder="Référence SMS transfert"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Capture d&apos;écran de preuve
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setDepFile(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              disabled={depSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs transition-colors"
            >
              {depSubmitting ? 'Envoi en cours...' : 'Soumettre le Dépôt'}
            </button>
          </form>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {activeModal === 'withdraw' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-lg text-sky-400 mb-1">Faire un Retrait</h3>
          <p className="text-xs text-red-400 font-semibold mb-4">{t.minWithdrawNotice}</p>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <input
                type="number"
                min={3000}
                value={witAmount}
                onChange={(e) => setWitAmount(e.target.value)}
                placeholder="Montant (ex: 4000)"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-xs text-slate-400 mt-2 font-mono tabular-nums">
                Vous recevrez : <span className="text-emerald-400 font-bold">{formatAr(witNet)}</span>{' '}
                (Frais 10% : {formatAr(witFee)})
              </p>
            </div>
            <select
              value={witMethod}
              onChange={(e) => setWitMethod(e.target.value as 'Orange Money' | 'Airtel Money')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Orange Money">Orange Money</option>
              <option value="Airtel Money">Airtel Money</option>
            </select>
            <input
              type="tel"
              value={witPhone}
              onChange={(e) => setWitPhone(e.target.value)}
              placeholder="Numéro de réception"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={witSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs transition-colors"
            >
              {witSubmitting ? 'Traitement...' : 'Confirmer le Retrait'}
            </button>
          </form>
        </div>
      )}

      {/* REFERRAL MODAL */}
      {activeModal === 'referral' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative text-center shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-lg text-amber-400 mb-2">Parrainage</h3>
          <p className="text-xs text-slate-400 mb-2">
            Gagnez 10% de commission lorsqu&apos;un filleul active son premier abonnement.
          </p>
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-sm text-amber-400 font-bold mb-4">
            {user.referral_code}
          </div>
          <p className="text-xs text-slate-400 mb-1.5">Lien d&apos;invitation direct</p>
          <input
            type="text"
            readOnly
            value={referralLink}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-center text-emerald-400 font-mono mb-4"
          />
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleCopyReferral}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copier le lien</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Rejoins BOSSMAN Mada ! ${referralLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager sur WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {activeModal === 'history' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between mb-4 pr-6">
            <h3 className="font-display font-bold text-lg text-white">
              Historique des Transactions
            </h3>
            <button
              type="button"
              onClick={onRefreshUser}
              className="text-xs text-amber-400 hover:underline font-medium"
            >
              Actualiser
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 pr-1">
            {user.history && user.history.length > 0 ? (
              [...user.history].reverse().map((h, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-white">{h.type}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{h.date}</p>
                  </div>
                  <span
                    className={`font-mono font-bold tabular-nums shrink-0 ${
                      h.amount > 0
                        ? 'text-emerald-400'
                        : h.amount < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {h.amount > 0 ? '+' : ''}
                    {formatAr(h.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">{t.noHistory}</p>
            )}
          </div>
        </div>
      )}

      {/* BUG REPORT MODAL */}
      {activeModal === 'bug' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-lg text-amber-400 mb-1">
            Signaler un Problème / Bug
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Envoyez votre commentaire et une capture d&apos;écran pour recevoir 1 000 Ar si approuvé par l&apos;admin.
          </p>
          <form onSubmit={handleBugSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Description du problème
              </label>
              <textarea
                rows={3}
                value={bugComment}
                onChange={(e) => setBugComment(e.target.value)}
                placeholder="Décrivez le bug ou problème rencontré..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Capture d&apos;écran (Image)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBugFile(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              disabled={bugSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors"
            >
              {bugSubmitting ? 'Envoi...' : 'Envoyer le rapport'}
            </button>
          </form>
        </div>
      )}

      {/* SUPPORT CHAT MODAL */}
      {activeModal === 'support' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative flex flex-col h-[540px] shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2 mb-3">
            <Headset className="w-4 h-4 text-red-400" />
            <span>Support Direct Admin &amp; Dépôt</span>
          </h3>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSupportTab('chat')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                supportTab === 'chat'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Discussion</span>
            </button>
            <button
              type="button"
              onClick={() => setSupportTab('deposit')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                supportTab === 'deposit'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Faire un Dépôt</span>
            </button>
          </div>

          {supportTab === 'chat' ? (
            <>
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5 overflow-y-auto space-y-2.5 text-xs mb-3">
                {supportMessages.length > 0 ? (
                  supportMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl max-w-[85%] ${
                        m.sender === 'user'
                          ? 'bg-red-600/20 border border-red-500/30 ml-auto text-white'
                          : 'bg-slate-800/90 text-slate-200'
                      }`}
                    >
                      <p className="text-[10px] text-slate-400 mb-1 font-mono">
                        {m.sender === 'user' ? 'Vous' : 'Admin'} · {m.date}
                      </p>
                      <p className="leading-relaxed">{m.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucun message pour le moment.</p>
                )}
                <div ref={supportEndRef} />
              </div>
              <form onSubmit={handleSendSupport} className="flex gap-2">
                <input
                  type="text"
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  placeholder="Écrivez votre message à l'admin..."
                  required
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 px-4 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
                <p className="text-red-400 font-semibold">{t.minDepositWithdrawNotice}</p>
                <p className="text-slate-300">
                  Orange Money : <strong className="text-amber-400 font-mono">0371897870</strong>{' '}
                  (Manovo)
                </p>
                <p className="text-slate-300">
                  Airtel Money : <strong className="text-red-400 font-mono">0336181891</strong>{' '}
                  (Riantso)
                </p>
              </div>
              <form onSubmit={handleChatDeposit} className="space-y-3">
                <input
                  type="number"
                  min={15000}
                  value={chatDepAmount}
                  onChange={(e) => setChatDepAmount(e.target.value)}
                  placeholder="Montant (ex: 15000)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="tel"
                  value={chatDepPhone}
                  onChange={(e) => setChatDepPhone(e.target.value)}
                  placeholder="Votre numéro expéditeur"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={chatDepRef}
                  onChange={(e) => setChatDepRef(e.target.value)}
                  placeholder="Référence SMS transfert"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChatDepFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={depSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  {depSubmitting ? 'Envoi...' : 'Soumettre le Dépôt'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* AI ASSISTANT MODAL */}
      {activeModal === 'ai' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative flex flex-col h-[520px] shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-base text-indigo-300 flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>Assistant IA · BOSSMAN Mada</span>
          </h3>
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5 overflow-y-auto space-y-2.5 text-xs mb-3">
            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl max-w-[88%] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/25 border border-indigo-500/30 ml-auto text-white'
                    : 'bg-slate-800/90 text-slate-200'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {aiLoading && (
              <div className="bg-slate-800/90 text-slate-400 p-3 rounded-xl max-w-[70%] text-xs">
                Rédaction en cours...
              </div>
            )}
            <div ref={aiEndRef} />
          </div>
          <form onSubmit={handleSendAi} className="flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Posez votre question ici..."
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-colors shrink-0"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {activeModal === 'settings' && (
        <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-display font-bold text-lg text-white mb-4">{t.settingsTitle}</h3>

          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block font-medium text-slate-400 mb-1.5">{t.chooseLang}</label>
              <select
                value={lang}
                onChange={(e) => {
                  const next = e.target.value as Language;
                  onChangeLang(next);
                  notify(
                    'success',
                    next === 'mg'
                      ? 'Voafidy soa aman-tsara ny fiteny Malagasy.'
                      : 'Langue française enregistrée.'
                  );
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="fr">Français</option>
                <option value="mg">Malgache (Malagasy)</option>
              </select>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-1.5">
              <p>
                <strong className="text-white">{t.siteNameLabel} :</strong> BOSSMAN Mada
              </p>
              <p className="text-slate-400">{t.aiHelpInfo}</p>
            </div>

            <div className="border-t border-slate-800 pt-4">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-400 font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t.deleteAccountBtn}</span>
                </button>
              ) : (
                <div className="bg-red-950/50 border border-red-500/40 rounded-xl p-3.5 space-y-3">
                  <p className="text-xs text-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      Voulez-vous vraiment supprimer définitivement votre compte et vos données ?
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-xs font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDeleteAccount}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-xs font-bold"
                    >
                      {deleting ? 'Suppression...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 mt-5 pt-4 text-center text-xs text-slate-500">
            <p className="text-slate-300 font-medium">{t.createdBy}</p>
            <p className="mt-0.5">{t.createdYear}</p>
          </div>
        </div>
      )}
    </div>
  );
}
