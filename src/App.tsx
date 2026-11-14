import { useCallback, useEffect, useState } from 'react';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { AdminView } from './components/AdminView';
import { ToastContainer, type ToastItem } from './components/ToastContainer';
import { TRANSLATIONS } from './i18n';
import type { Language, MaintenanceConfig, User } from './types';

const DEFAULT_MAINTENANCE: MaintenanceConfig = {
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
};

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('bossman_lang');
    return saved === 'mg' ? 'mg' : 'fr';
  });

  const [pendingRef] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      localStorage.setItem('bossman_pending_ref', refParam);
      return refParam;
    }
    return localStorage.getItem('bossman_pending_ref');
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('bossman_current_user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [booting, setBooting] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE);
  const [adminBadgeCount, setAdminBadgeCount] = useState(0);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  function handleChangeLang(next: Language) {
    setLang(next);
    localStorage.setItem('bossman_lang', next);
  }

  const syncBadges = useCallback(async (phone?: string) => {
    try {
      const url = phone
        ? `/api/state/badges?phone=${encodeURIComponent(phone)}`
        : '/api/state/badges';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setAdminBadgeCount(data.adminTotalBadge || 0);
      setUserUnreadCount(data.userUnreadAdminCount || 0);
      if (data.maintenance) setMaintenance(data.maintenance);
    } catch {
      // ignore transient network errors
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(currentUser.phone)}`);
      if (res.status === 404) {
        setCurrentUser(null);
        localStorage.removeItem('bossman_current_user');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('bossman_current_user', JSON.stringify(data.user));
      }
      if (data.maintenance) {
        setMaintenance(data.maintenance);
      }
    } catch {
      // ignore
    }
  }, [currentUser?.phone]);

  useEffect(() => {
    syncBadges(currentUser?.phone);
    if (currentUser) {
      refreshUser();
    }
    const timer = setInterval(() => {
      syncBadges(currentUser?.phone);
      if (currentUser) refreshUser();
    }, 10000);
    return () => clearInterval(timer);
  }, [currentUser?.phone, syncBadges, refreshUser]);

  function handleAuthSuccess(user: User, maint: MaintenanceConfig) {
    setBooting(true);
    setMaintenance(maint || DEFAULT_MAINTENANCE);
    setTimeout(() => {
      setCurrentUser(user);
      localStorage.setItem('bossman_current_user', JSON.stringify(user));
      setBooting(false);
    }, 550);
  }

  function handleUserUpdated(user: User) {
    setCurrentUser(user);
    localStorage.setItem('bossman_current_user', JSON.stringify(user));
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem('bossman_current_user');
  }

  return (
    <>
      {booting ? (
        <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-amber-300">
            {TRANSLATIONS[lang].loadingWorkspace}
          </p>
        </div>
      ) : isAdmin ? (
        <AdminView
          onExitAdmin={() => {
            setIsAdmin(false);
            syncBadges(currentUser?.phone);
          }}
          notify={notify}
        />
      ) : currentUser ? (
        <DashboardView
          user={currentUser}
          lang={lang}
          maintenance={maintenance}
          userUnreadCount={userUnreadCount}
          onChangeLang={handleChangeLang}
          onRefreshUser={refreshUser}
          onUserUpdated={handleUserUpdated}
          onLogout={handleLogout}
          notify={notify}
        />
      ) : (
        <AuthView
          lang={lang}
          onChangeLang={handleChangeLang}
          pendingRef={pendingRef}
          adminBadgeCount={adminBadgeCount}
          onAuthSuccess={handleAuthSuccess}
          onAdminLoginSuccess={() => setIsAdmin(true)}
          notify={notify}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
