import { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  Users,
  Clock,
  Headset,
  Bot,
  Settings,
  LogOut,
  Timer,
  Bug,
  CheckCircle2,
  Gem,
  AlertTriangle,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n';
import {
  SUBSCRIPTION_PLANS,
  type Language,
  type MaintenanceConfig,
  type SectionKey,
  type SubscriptionPlan,
  type User,
} from '../types';
import { formatAr, formatCountdown, playNotificationSound } from '../utils/sound';
import { Modals, type ActiveModalType } from './Modals';

interface DashboardViewProps {
  user: User;
  lang: Language;
  maintenance: MaintenanceConfig;
  userUnreadCount: number;
  onChangeLang: (lang: Language) => void;
  onRefreshUser: () => Promise<void>;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function DashboardView({
  user,
  lang,
  maintenance,
  userUnreadCount,
  onChangeLang,
  onRefreshUser,
  onUserUpdated,
  onLogout,
  notify,
}: DashboardViewProps) {
  const t = TRANSLATIONS[lang];
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-process payout when countdown reaches zero
  useEffect(() => {
    if (user.active_sub && nowMs >= user.active_sub.nextPayoutAt) {
      onRefreshUser();
    }
  }, [nowMs, user.active_sub, onRefreshUser]);

  const testExpiresAt = (user.test_start_time || nowMs) + 24 * 3600 * 1000;
  const isTestActive = nowMs < testExpiresAt;

  function openSection(section: SectionKey, modal: ActiveModalType) {
    if (maintenance.sections[section]) {
      notify('error', 'Cette section est actuellement en maintenance.');
      return;
    }
    setActiveModal(modal);
  }

  async function handleSubscribe(plan: SubscriptionPlan) {
    if (maintenance.subscriptions[plan.id]) {
      notify('error', 'Cet abonnement est actuellement en maintenance.');
      return;
    }
    if (user.balance < plan.price) {
      notify('error', 'Solde insuffisant. Veuillez effectuer un dépôt.');
      return;
    }
    setSubscribingId(plan.id);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(user.phone)}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          price: plan.price,
          income: plan.income,
          durationDays: plan.duration,
          intervalDays: plan.interval,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Impossible d’activer cet abonnement.');
        return;
      }
      playNotificationSound();
      onUserUpdated(data.user);
      notify('success', `${plan.name} activé avec succès !`);
    } catch {
      notify('error', 'Erreur réseau lors de la souscription.');
    } finally {
      setSubscribingId(null);
    }
  }

  const quickActions: Array<{
    key: SectionKey;
    modal: ActiveModalType;
    label: string;
    icon: typeof Wallet;
    accent: string;
  }> = [
    {
      key: 'deposit',
      modal: 'deposit',
      label: t.deposit,
      icon: Wallet,
      accent: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      key: 'withdraw',
      modal: 'withdraw',
      label: t.withdraw,
      icon: ArrowUpRight,
      accent: 'text-sky-400 bg-sky-500/10',
    },
    {
      key: 'referral',
      modal: 'referral',
      label: t.referral,
      icon: Users,
      accent: 'text-amber-400 bg-amber-500/10',
    },
    {
      key: 'history',
      modal: 'history',
      label: t.history,
      icon: Clock,
      accent: 'text-slate-300 bg-slate-800',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-slate-800 bg-[#0c111d]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 sm:gap-8">
          <span className="font-display text-lg font-extrabold tracking-tight text-amber-400 whitespace-nowrap shrink-0">
            BOSSMAN Mada
          </span>

          <nav className="flex items-center gap-2 sm:gap-5 text-xs font-medium text-slate-300">
            <button
              type="button"
              onClick={() => openSection('support', 'support')}
              className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                maintenance.sections.support ? 'text-red-400' : ''
              }`}
            >
              <Headset className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">{t.support}</span>
              {userUnreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold tabular-nums">
                  {userUnreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('ai')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">{t.aiAssistant}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('settings')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">{t.settings}</span>
            </button>
          </nav>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-red-500/50 hover:text-red-300 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Wallet, Quick Actions, 24h Test, Active Plan */}
          <div className="lg:col-span-5 space-y-5">
            {/* Account & Balance Summary */}
            <section className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 truncate font-mono">{user.phone}</p>
                  <h1 className="font-display text-xl font-bold text-white truncate mt-0.5">
                    {user.name}
                  </h1>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{t.mainBalance}</p>
                  <p className="font-mono text-2xl font-bold text-amber-400 tabular-nums mt-0.5">
                    {formatAr(user.balance)}
                  </p>
                </div>
              </div>

              {/* 4-Action Grid */}
              <div className="grid grid-cols-4 gap-2.5 pt-5">
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  const isMaint = maintenance.sections[act.key];
                  return (
                    <button
                      key={act.key}
                      type="button"
                      onClick={() => openSection(act.key, act.modal)}
                      className={`relative rounded-xl border p-3 flex flex-col items-center justify-center gap-2 transition-colors ${
                        isMaint
                          ? 'border-red-500/60 bg-red-950/30 text-red-300'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${act.accent}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold whitespace-nowrap">
                        {act.label}
                      </span>
                      {isMaint && (
                        <span className="text-[9px] font-bold text-red-400">
                          {t.maintenanceShort}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Active Subscription Card */}
            {user.active_sub && (
              <section className="bg-[#0f1624] border border-emerald-500/40 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h2 className="font-display text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {t.activeSubTitle} · {user.active_sub.name}
                    </span>
                  </h2>
                  <span className="text-xs font-medium text-emerald-300">{t.activeStatus}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <span>{t.nextPayoutIn}</span>
                  <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                    {formatCountdown(user.active_sub.nextPayoutAt, nowMs)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-slate-400 mt-1.5">
                  <span>Montant du cycle</span>
                  <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                    +{formatAr(user.active_sub.income)}
                  </span>
                </div>
              </section>
            )}

            {/* 24h Test Session Card */}
            {isTestActive && (
              <section className="bg-[#0f1624] border border-amber-500/35 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="font-display text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Timer className="w-4 h-4 shrink-0" />
                    <span>{t.testSessionTitle}</span>
                  </h2>
                  <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                    {formatCountdown(testExpiresAt, nowMs)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{t.testSessionDesc}</p>
                <button
                  type="button"
                  onClick={() => setActiveModal('bug')}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Bug className="w-4 h-4 shrink-0" />
                  <span>{t.reportBugBtn}</span>
                </button>
              </section>
            )}
          </div>

          {/* Right Column: Available Subscriptions */}
          <section className="lg:col-span-7 bg-[#0f1624] border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Gem className="w-4 h-4 text-amber-400" />
                <span>{t.availableSubs}</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                5 offres · Ar
              </span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isMaint = Boolean(maintenance.subscriptions[plan.id]);
                const isLoading = subscribingId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`py-4 first:pt-1 last:pb-1 flex flex-col gap-3 ${
                      isMaint ? 'opacity-80' : ''
                    }`}
                  >
                    {isMaint && (
                      <div className="bg-red-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.maintenanceBanner}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-display text-sm font-bold ${
                              plan.isVip ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {plan.name}
                          </h3>
                          <span className="text-xs text-slate-400">· {plan.tierLabel}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono tabular-nums">
                          {t.incomePerCycle} :{' '}
                          <strong className="text-amber-300">+{formatAr(plan.income)}</strong>{' '}
                          <span className="text-slate-400 font-sans">
                            ({t.everyNDays} {plan.interval} {t.durationDays} · {plan.duration}{' '}
                            {t.durationDays})
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="block text-[11px] text-slate-400">{t.price}</span>
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {formatAr(plan.price)}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isMaint || isLoading}
                          onClick={() => handleSubscribe(plan)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                            isMaint
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : plan.isVip
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isLoading ? 'Activation...' : t.subscribeBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Modals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        user={user}
        lang={lang}
        onChangeLang={onChangeLang}
        onRefreshUser={onRefreshUser}
        onAccountDeleted={onLogout}
        notify={notify}
      />
    </div>
  );
}
