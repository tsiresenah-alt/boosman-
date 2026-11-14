export type Language = 'fr' | 'mg';

export type SectionKey = 'deposit' | 'withdraw' | 'referral' | 'history' | 'support';

export interface HistoryItem {
  type: string;
  amount: number;
  date: string;
}

export interface ActiveSubscription {
  id: number;
  name: string;
  income: number;
  intervalDays: number;
  expiresAt: number;
  nextPayoutAt: number;
}

export interface User {
  name: string;
  phone: string;
  pass?: string;
  balance: number;
  referral_code: string;
  referred_by: string | null;
  referral_rewarded?: boolean;
  active_sub: ActiveSubscription | null;
  test_start_time: number;
  history: HistoryItem[];
  created_at?: string;
}

export type RequestType = 'Dépôt' | 'Retrait' | 'Nouvelle Inscription' | 'Rapport de Bug';
export type RequestStatus = 'En attente' | 'Validé' | 'Refusé' | 'Nouveau Membre';

export interface AppRequest {
  id: number;
  type: RequestType;
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
  status: RequestStatus;
  viewed: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  user_phone: string;
  user_name: string;
  sender: 'user' | 'admin';
  text: string;
  date: string;
  read: boolean;
}

export interface MaintenanceConfig {
  sections: Record<SectionKey, boolean>;
  subscriptions: Record<number, boolean>;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  tierLabel: string;
  price: number;
  income: number;
  duration: number;
  interval: number;
  isVip: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'ABONNEMENT 1',
    tierLabel: 'Débutant',
    price: 15000,
    income: 1000,
    duration: 31,
    interval: 2,
    isVip: false,
  },
  {
    id: 2,
    name: 'ABONNEMENT 2',
    tierLabel: 'Standard',
    price: 25000,
    income: 1500,
    duration: 30,
    interval: 2,
    isVip: false,
  },
  {
    id: 3,
    name: 'ABONNEMENT 3',
    tierLabel: 'Pro',
    price: 40000,
    income: 3000,
    duration: 25,
    interval: 3,
    isVip: false,
  },
  {
    id: 4,
    name: 'ABONNEMENT 4',
    tierLabel: 'VIP BOSS',
    price: 75000,
    income: 5000,
    duration: 31,
    interval: 3,
    isVip: true,
  },
  {
    id: 5,
    name: 'ABONNEMENT 5',
    tierLabel: 'VIP Premium',
    price: 90000,
    income: 6000,
    duration: 40,
    interval: 4,
    isVip: true,
  },
];
