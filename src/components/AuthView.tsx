import React, { useState } from 'react';
import { Shield, Lock, Smartphone, User as UserIcon, ArrowRight, X, Check } from 'lucide-react';
import { TRANSLATIONS } from '../i18n';
import { SUBSCRIPTION_PLANS, type Language, type MaintenanceConfig, type User } from '../types';
import { formatAr } from '../utils/sound';

interface AuthViewProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  pendingRef: string | null;
  adminBadgeCount: number;
  onAuthSuccess: (user: User, maintenance: MaintenanceConfig) => void;
  onAdminLoginSuccess: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function AuthView({
  lang,
  onChangeLang,
  pendingRef,
  adminBadgeCount,
  onAuthSuccess,
  onAdminLoginSuccess,
  notify,
}: AuthViewProps) {
  const t = TRANSLATIONS[lang];
  const [tab, setTab] = useState<'register' | 'login'>('register');

  // Register state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Login state
  const [logPhone, setLogPhone] = useState('');
  const [logPass, setLogPass] = useState('');

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 'loading' | 2 | 3>(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [demoSmsCode, setDemoSmsCode] = useState<string | null>(null);
  const [forgotNewPass, setForgotNewPass] = useState('');

  // Admin Passcode modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const isPassValid = regPass.length >= 6;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regPass.length < 6) {
      notify('error', t.passwordRule);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          pass: regPass,
          referredBy: pendingRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Erreur lors de l’inscription.');
        return;
      }
      notify('success', 'Inscription réussie ! +2 000 Ar de bonus crédités.');
      onAuthSuccess(data.user, data.maintenance);
    } catch {
      notify('error', 'Impossible de joindre le serveur.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: logPhone, pass: logPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Numéro ou mot de passe incorrect.');
        return;
      }
      onAuthSuccess(data.user, data.maintenance);
    } catch {
      notify('error', 'Impossible de joindre le serveur.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendSmsCode(e: React.FormEvent) {
    e.preventDefault();
    setForgotStep('loading');
    try {
      const res = await fetch('/api/auth/forgot-password/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotStep(1);
        notify('error', data.error || 'Compte introuvable.');
        return;
      }
      setDemoSmsCode(data.demoCode);
      setForgotStep(2);
      notify('info', `Code SMS envoyé au ${forgotPhone}.`);
    } catch {
      setForgotStep(1);
      notify('error', 'Erreur réseau.');
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone, code: forgotCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Code incorrect.');
        return;
      }
      setForgotStep(3);
    } catch {
      notify('error', 'Erreur réseau.');
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (forgotNewPass.length < 6) {
      notify('error', t.passwordRule);
      return;
    }
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone, newPass: forgotNewPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Impossible de modifier le mot de passe.');
        return;
      }
      notify('success', 'Mot de passe modifié avec succès. Connectez-vous.');
      setForgotOpen(false);
      setForgotStep(1);
      setForgotPhone('');
      setForgotCode('');
      setForgotNewPass('');
      setDemoSmsCode(null);
      setTab('login');
    } catch {
      notify('error', 'Erreur réseau.');
    }
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdminSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Mot de passe administrateur incorrect.');
        return;
      }
      setAdminModalOpen(false);
      setAdminCode('');
      onAdminLoginSuccess();
    } catch {
      notify('error', 'Impossible de vérifier le code administrateur.');
    } finally {
      setAdminSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090d16] text-slate-100">
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#0c111d]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="font-display text-lg font-extrabold tracking-tight text-amber-400 whitespace-nowrap shrink-0">
            BOSSMAN Mada
          </span>
          <div className="flex items-center gap-4 shrink-0">
            <select
              aria-label={t.chooseLang}
              value={lang}
              onChange={(e) => onChangeLang(e.target.value as Language)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="fr">Français</option>
              <option value="mg">Malagasy</option>
            </select>
            <button
              type="button"
              onClick={() => setAdminModalOpen(true)}
              className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-amber-500/50 text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.adminAccess}</span>
              {adminBadgeCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold tabular-nums">
                  {adminBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Panel: Platform Overview */}
          <section className="lg:col-span-6 bg-[#0f1624] border border-slate-800 rounded-2xl p-7 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-400 tracking-wide mb-2">
                Madagascar · Mobile Money
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
                BOSSMAN Mada
              </h1>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-md">{t.welcome}</p>

              <div className="mt-8 border-t border-slate-800 pt-6">
                <h2 className="text-xs font-semibold text-slate-400 mb-4">
                  Aperçu des abonnements & versements
                </h2>
                <div className="divide-y divide-slate-800/80">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className="py-2.5 flex items-center justify-between text-xs gap-4"
                    >
                      <div className="min-w-0">
                        <span
                          className={`font-semibold ${
                            plan.isVip ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {plan.name}
                        </span>
                        <span className="text-slate-500 ml-2">· {plan.tierLabel}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
                        <span className="text-emerald-400 font-semibold">
                          +{formatAr(plan.income)} / {plan.interval}j
                        </span>
                        <span className="text-slate-300 font-bold w-20 text-right">
                          {formatAr(plan.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>Orange Money · Airtel Money</span>
              <span className="font-mono tabular-nums text-slate-300">
                Bonus inscription : +2 000 Ar
              </span>
            </div>
          </section>

          {/* Right Panel: Auth Card */}
          <section className="lg:col-span-6 bg-[#0f1624] border border-slate-800 rounded-2xl p-7 sm:p-8 flex flex-col justify-center">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'register'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.registerTab}
              </button>
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'login'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.loginTab}
              </button>
            </div>

            {tab === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.usernameLabel}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      placeholder="Ex: Rakoto Jean"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="034XXXXXXX"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.passwordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      required
                      className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none transition-colors ${
                        regPass.length === 0
                          ? 'border-slate-800 focus:border-amber-400'
                          : isPassValid
                            ? 'border-emerald-500/70'
                            : 'border-red-500/70'
                      }`}
                    />
                  </div>
                  <p
                    className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                      regPass.length === 0
                        ? 'text-slate-400'
                        : isPassValid
                          ? 'text-emerald-400'
                          : 'text-red-400'
                    }`}
                  >
                    {isPassValid && <Check className="w-3.5 h-3.5" />}
                    <span>{isPassValid ? t.passwordValid : t.passwordRule}</span>
                  </p>
                </div>

                {pendingRef && (
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5">
                    Code parrain détecté : <strong className="font-mono">{pendingRef}</strong>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold py-3.5 px-5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>{t.registerBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={logPhone}
                      onChange={(e) => setLogPhone(e.target.value)}
                      placeholder="034XXXXXXX"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {t.passwordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={logPass}
                      onChange={(e) => setLogPass(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotOpen(true);
                    }}
                    className="text-xs text-amber-400 hover:underline font-medium"
                  >
                    {t.forgotPassword}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold py-3.5 px-5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>{t.loginBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        BOSSMAN Mada · {t.createdBy} · 2026
      </footer>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-lg text-amber-400 mb-3">
              Récupération du mot de passe
            </h3>

            {forgotStep === 1 && (
              <form onSubmit={handleSendSmsCode} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Entrez votre numéro de téléphone associé à votre compte pour recevoir un code de confirmation à 4 chiffres.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    placeholder="034XXXXXXX"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Envoyer le code SMS
                </button>
              </form>
            )}

            {forgotStep === 'loading' && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-9 h-9 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-amber-300 font-medium">
                  Envoi du code SMS en cours...
                </p>
              </div>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-xs text-emerald-400 font-medium">
                  Un code de confirmation a été envoyé sur votre téléphone.
                </p>
                {demoSmsCode && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                    Message SMS reçu : votre code de vérification est{' '}
                    <strong className="font-mono text-amber-400 tracking-widest">
                      {demoSmsCode}
                    </strong>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Code de confirmation à 4 chiffres
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    placeholder="1234"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-base font-mono text-center tracking-widest text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Vérifier le code
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-300">
                  Code vérifié. Entrez votre nouveau mot de passe (6 caractères minimum).
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Changer le mot de passe
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1624] border border-slate-800 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
            <button
              type="button"
              onClick={() => setAdminModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-lg text-white mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>{t.adminAccess}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Saisissez le code administrateur pour accéder à la console de gestion.
            </p>
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Mot de passe admin"
                required
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={adminSubmitting}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors"
              >
                {adminSubmitting ? 'Vérification...' : 'Ouvrir la console Admin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
