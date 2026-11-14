import { useEffect, useState } from 'react';
import {
  Shield,
  LogOut,
  RefreshCw,
  Wrench,
  Users,
  FileCheck2,
  MessageSquare,
  Search,
  Check,
  X,
  Send,
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  type AppRequest,
  type ChatMessage,
  type MaintenanceConfig,
  type SectionKey,
  type User,
} from '../types';
import { formatAr, playNotificationSound } from '../utils/sound';

interface AdminViewProps {
  onExitAdmin: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const SECTION_LABELS: Array<{ key: SectionKey; label: string }> = [
  { key: 'deposit', label: 'Dépôt' },
  { key: 'withdraw', label: 'Retrait' },
  { key: 'referral', label: 'Parrainage' },
  { key: 'history', label: 'Historique' },
  { key: 'support', label: 'Support Admin' },
];

export function AdminView({ onExitAdmin, notify }: AdminViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<AppRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>({
    sections: {
      deposit: false,
      withdraw: false,
      referral: false,
      history: false,
      support: false,
    },
    subscriptions: { 1: false, 2: false, 3: false, 4: false, 5: false },
  });
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'deposit' | 'withdraw' | 'bug'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  async function loadAdminData() {
    try {
      const res = await fetch('/api/admin/data');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setRequests(data.requests || []);
        setMessages(data.messages || []);
        if (data.maintenance) setMaintenance(data.maintenance);
      }
    } catch {
      notify('error', 'Impossible de charger les données administrateur.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    const timer = setInterval(loadAdminData, 8000);
    return () => clearInterval(timer);
  }, []);

  async function toggleMaintenance(category: 'sections' | 'subscriptions', key: string, value: boolean) {
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, key, value }),
      });
      const data = await res.json();
      if (res.ok && data.maintenance) {
        setMaintenance(data.maintenance);
        notify('info', `Maintenance ${value ? 'activée' : 'désactivée'}.`);
      }
    } catch {
      notify('error', 'Erreur lors de la mise à jour de maintenance.');
    }
  }

  async function handleRequestAction(id: number, action: 'Valider' | 'Refuser') {
    try {
      const res = await fetch(`/api/admin/requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Action impossible.');
        return;
      }
      playNotificationSound();
      notify('success', `Demande ${action === 'Valider' ? 'validée' : 'refusée'} avec succès.`);
      await loadAdminData();
    } catch {
      notify('error', 'Erreur réseau.');
    }
  }

  async function handleSendReply(msg: ChatMessage) {
    const text = (replyDrafts[msg.id] || '').trim();
    if (!text) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_phone: msg.user_phone,
          user_name: 'Admin',
          sender: 'admin',
          text,
        }),
      });
      if (res.ok) {
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: msg.user_phone, targetSender: 'user' }),
        });
        setReplyDrafts((prev) => ({ ...prev, [msg.id]: '' }));
        playNotificationSound();
        notify('success', `Réponse envoyée à ${msg.user_name}.`);
        await loadAdminData();
      }
    } catch {
      notify('error', "Impossible d'envoyer la réponse.");
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q);
  });

  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'pending') return r.status === 'En attente';
    if (requestFilter === 'deposit') return r.type === 'Dépôt';
    if (requestFilter === 'withdraw') return r.type === 'Retrait';
    if (requestFilter === 'bug') return r.type === 'Rapport de Bug';
    return true;
  });

  const pendingReqCount = requests.filter((r) => r.status === 'En attente').length;
  const unreadUserMessages = messages.filter((m) => m.sender === 'user' && !m.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-slate-800 bg-[#0c111d]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 sm:gap-8">
          <span className="font-display text-lg font-extrabold tracking-tight text-red-400 flex items-center gap-2 whitespace-nowrap shrink-0">
            <Shield className="w-5 h-5" />
            <span>BOSSMAN Admin</span>
          </span>

          <div className="flex items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
            <span>Membres : {users.length}</span>
            <span className="text-slate-600">·</span>
            <span className={pendingReqCount > 0 ? 'text-amber-400 font-bold' : ''}>
              En attente : {pendingReqCount}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quitter Admin</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">
            Chargement des données administrateur...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Maintenance & Users */}
            <div className="lg:col-span-4 space-y-6">
              {/* Section Maintenance */}
              <section className="bg-[#0f1624] border border-slate-800 rounded-2xl p-5">
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Maintenance Sections</span>
                </h2>
                <div className="divide-y divide-slate-800/80">
                  {SECTION_LABELS.map((sec) => {
                    const active = maintenance.sections[sec.key];
                    return (
                      <div key={sec.key} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium">{sec.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleMaintenance('sections', sec.key, !active)}
                          className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                            active
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {active ? 'En maintenance' : 'Actif'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Subscription Maintenance */}
              <section className="bg-[#0f1624] border border-slate-800 rounded-2xl p-5">
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Maintenance Abonnements</span>
                </h2>
                <div className="divide-y divide-slate-800/80">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const active = Boolean(maintenance.subscriptions[plan.id]);
                    return (
                      <div key={plan.id} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium">
                          {plan.name} ({plan.tierLabel})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            toggleMaintenance('subscriptions', String(plan.id), !active)
                          }
                          className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                            active
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {active ? 'En maintenance' : 'Actif'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Users List */}
              <section className="bg-[#0f1624] border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Utilisateurs ({users.length})</span>
                  </h2>
                </div>
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Rechercher nom ou numéro..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80 pr-1">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <div key={u.phone} className="py-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white truncate">{u.name}</span>
                          <span className="font-mono font-bold text-amber-400 tabular-nums shrink-0">
                            {formatAr(u.balance)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>{u.phone}</span>
                          <span>{u.active_sub ? u.active_sub.name : 'Aucun abonnement'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-6">
                      Aucun utilisateur trouvé.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Center Column: Requests & Bug Reports */}
            <section className="lg:col-span-4 bg-[#0f1624] border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Demandes &amp; Rapports</span>
                </h2>
                {pendingReqCount > 0 && (
                  <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                    {pendingReqCount} à traiter
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 text-[11px] font-semibold">
                {(
                  [
                    { id: 'all', label: 'Tout' },
                    { id: 'pending', label: 'En attente' },
                    { id: 'deposit', label: 'Dépôts' },
                    { id: 'withdraw', label: 'Retraits' },
                    { id: 'bug', label: 'Bugs' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRequestFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                      requestFilter === f.id
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[640px] overflow-y-auto space-y-3 pr-1">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((r) => (
                    <div
                      key={r.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-white">
                            {r.type} · {r.user_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {r.user_phone} · {r.created_at}
                          </p>
                        </div>
                        {r.amount > 0 && (
                          <span className="font-mono font-bold text-amber-400 tabular-nums shrink-0">
                            {formatAr(r.amount)}
                          </span>
                        )}
                      </div>

                      {r.method && (
                        <p className="text-[11px] text-slate-300">
                          Méthode : <strong>{r.method}</strong> · Réception :{' '}
                          <span className="font-mono">{r.phone}</span> · Net :{' '}
                          <strong className="text-emerald-400 font-mono">
                            {formatAr(r.net_amount ?? r.amount)}
                          </strong>
                        </p>
                      )}

                      {r.ref && (
                        <p className="text-[11px] text-slate-300">
                          Expéditeur : <span className="font-mono">{r.phone}</span> · Réf SMS :{' '}
                          <strong className="text-white font-mono">{r.ref}</strong>
                        </p>
                      )}

                      {r.comment && (
                        <p className="text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                          {r.comment}
                        </p>
                      )}

                      {r.proof_data_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(r.proof_data_url || null)}
                          className="block w-full text-left"
                        >
                          <img
                            src={r.proof_data_url}
                            alt={`Preuve ${r.type}`}
                            className="max-h-36 w-full object-cover rounded-lg border border-slate-800 hover:opacity-90 transition-opacity"
                          />
                        </button>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`text-[11px] font-semibold ${
                            r.status === 'Validé'
                              ? 'text-emerald-400'
                              : r.status === 'Refusé'
                                ? 'text-red-400'
                                : r.status === 'En attente'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                          }`}
                        >
                          Statut : {r.status}
                        </span>

                        {r.status === 'En attente' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestAction(r.id, 'Valider')}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Valider</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestAction(r.id, 'Refuser')}
                              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Refuser</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-10">
                    Aucune demande dans cette catégorie.
                  </p>
                )}
              </div>
            </section>

            {/* Right Column: Support Messages */}
            <section className="lg:col-span-4 bg-[#0f1624] border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Messages Support</span>
                </h2>
                {unreadUserMessages > 0 && (
                  <span className="text-xs font-mono font-bold text-red-400 tabular-nums">
                    {unreadUserMessages} non lu(s)
                  </span>
                )}
              </div>

              <div className="max-h-[680px] overflow-y-auto space-y-3 pr-1">
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`border rounded-xl p-3.5 text-xs space-y-2 ${
                        m.sender === 'admin'
                          ? 'bg-slate-900/60 border-slate-800'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          {m.sender === 'admin' ? 'Admin → ' : ''}
                          {m.user_name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {m.user_phone} · {m.date}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{m.text}</p>
                      {m.sender === 'user' && (
                        <div className="flex gap-1.5 pt-1">
                          <input
                            type="text"
                            value={replyDrafts[m.id] || ''}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                            }
                            placeholder="Répondre à cet utilisateur..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(m)}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Envoyer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-10">
                    Aucun message support.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Proof Image Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white bg-slate-800 p-2 rounded-full"
            aria-label="Fermer l'image"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImage}
            alt="Preuve agrandie"
            className="max-h-[85vh] max-w-full rounded-xl border border-slate-700"
          />
        </div>
      )}
    </div>
  );
}
