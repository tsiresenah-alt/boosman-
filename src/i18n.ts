import type { Language } from './types';

export const TRANSLATIONS: Record<
  Language,
  {
    welcome: string;
    registerTab: string;
    loginTab: string;
    usernameLabel: string;
    phoneLabel: string;
    passwordLabel: string;
    passwordRule: string;
    passwordValid: string;
    registerBtn: string;
    loginBtn: string;
    forgotPassword: string;
    adminAccess: string;
    mainBalance: string;
    deposit: string;
    withdraw: string;
    referral: string;
    history: string;
    support: string;
    aiAssistant: string;
    settings: string;
    logout: string;
    testSessionTitle: string;
    testSessionDesc: string;
    reportBugBtn: string;
    activeSubTitle: string;
    nextPayoutIn: string;
    activeStatus: string;
    availableSubs: string;
    durationDays: string;
    incomePerCycle: string;
    everyNDays: string;
    price: string;
    subscribeBtn: string;
    maintenanceBanner: string;
    maintenanceShort: string;
    settingsTitle: string;
    chooseLang: string;
    siteNameLabel: string;
    aiHelpInfo: string;
    deleteAccountBtn: string;
    createdBy: string;
    createdYear: string;
    loadingWorkspace: string;
    minDepositWithdrawNotice: string;
    minWithdrawNotice: string;
    noHistory: string;
  }
> = {
  fr: {
    welcome: "Gagnez de l'argent en ligne avec élégance à Madagascar",
    registerTab: 'Inscription',
    loginTab: 'Connexion',
    usernameLabel: "Nom d'utilisateur",
    phoneLabel: 'Numéro de téléphone',
    passwordLabel: 'Mot de passe',
    passwordRule: 'Le mot de passe doit contenir au moins 6 caractères.',
    passwordValid: 'Mot de passe valide.',
    registerBtn: "S'inscrire (+2 000 Ar Bonus)",
    loginBtn: 'Se connecter',
    forgotPassword: 'Mot de passe oublié ?',
    adminAccess: 'Accès Administrateur',
    mainBalance: 'Solde principal',
    deposit: 'Dépôt',
    withdraw: 'Retrait',
    referral: 'Parrainage',
    history: 'Historique',
    support: 'Support Admin',
    aiAssistant: 'Assistant IA',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    testSessionTitle: 'Session Test (Horloge 24h)',
    testSessionDesc:
      "Testez la plateforme pendant 24h. Envoyez un commentaire et une capture d'écran d'un bug pour recevoir 1 000 Ar après validation admin.",
    reportBugBtn: 'Signaler un problème (Commentaire + Capture)',
    activeSubTitle: 'Abonnement Actif',
    nextPayoutIn: 'Prochain versement dans',
    activeStatus: 'Actif en cours',
    availableSubs: 'Abonnements Disponibles',
    durationDays: 'jours',
    incomePerCycle: 'Revenu',
    everyNDays: 'tous les',
    price: 'Prix',
    subscribeBtn: 'Souscrire',
    maintenanceBanner: "L'ADMIN EFFECTUE UNE MISE À JOUR — MAINTENANCE",
    maintenanceShort: 'MAINTENANCE',
    settingsTitle: 'Paramètres & Informations',
    chooseLang: 'Choisir la langue / Fidy fiteny',
    siteNameLabel: 'Nom du site',
    aiHelpInfo: 'Assistant IA et support actif 24/7 pour vos questions.',
    deleteAccountBtn: 'Supprimer mon compte',
    createdBy: 'Créé par Manovo Hasambarana',
    createdYear: 'Date de création : 2026',
    loadingWorkspace: 'Chargement de votre espace...',
    minDepositWithdrawNotice: 'Minimum dépôt : 15 000 Ar · Minimum retrait : 3 000 Ar',
    minWithdrawNotice: 'Minimum retrait : 3 000 Ar (Frais de transfert : 10%)',
    noHistory: 'Aucune transaction enregistrée.',
  },
  mg: {
    welcome: "Mahazoa vola an-tserasera amin'ny fomba kanto eto Madagasikara",
    registerTab: 'Fisoratana anarana',
    loginTab: 'Fidirana',
    usernameLabel: 'Anarana mpampiasa',
    phoneLabel: 'Laharana finday',
    passwordLabel: 'Teny miafina',
    passwordRule: 'Ny teny miafina dia tokony hisy litera na isa 6 farafahakeliny.',
    passwordValid: 'Teny miafina mety tsara.',
    registerBtn: 'Hisoratra anarana (+2 000 Ar Bonus)',
    loginBtn: 'Hiditra',
    forgotPassword: 'Hadino ny teny miafina ?',
    adminAccess: 'Fidirana Mpitantana (Admin)',
    mainBalance: 'Vola anaty kaonty',
    deposit: 'Fampidirana',
    withdraw: 'Famoahana',
    referral: 'Fanasana namana',
    history: 'Tantara',
    support: 'Fanampiana Admin',
    aiAssistant: 'Mpanampy IA',
    settings: 'Fikirakirana',
    logout: 'Hivoaka',
    testSessionTitle: 'Fotoam-panandramana (Ora 24)',
    testSessionDesc:
      "Andramo mandritra ny 24 ora ny tranonkala. Mandefasa fanamarihana sy sary (capture) raha mahita olana mba hahazoana 1 000 Ar rehefa eken'ny admin.",
    reportBugBtn: 'Hilaza olana (Fanamarihana + Sary)',
    activeSubTitle: 'Tolotra Mandeha',
    nextPayoutIn: 'Fandoavana manaraka ao anatin’ny',
    activeStatus: 'Mandeha ankehitriny',
    availableSubs: 'Tolotra Azo Safidiana',
    durationDays: 'andro',
    incomePerCycle: 'Tombom-barotra',
    everyNDays: 'isan’ny',
    price: 'Vidiny',
    subscribeBtn: 'Hisafidy',
    maintenanceBanner: 'EO AM-PANAVAOZANA NY ADMIN — FIKOJAKOJANA',
    maintenanceShort: 'FIKOJAKOJANA',
    settingsTitle: 'Fikirakirana & Fampahalalana',
    chooseLang: 'Fidio ny fiteny / Choisir la langue',
    siteNameLabel: 'Anaran’ny tranonkala',
    aiHelpInfo: 'Mpanampy IA sy fanampiana mavitrika 24/7 ho an’ny fanontanianao.',
    deleteAccountBtn: 'Fafao ny kaontiko',
    createdBy: 'Noforonin’i Manovo Hasambarana',
    createdYear: 'Taona namoronana : 2026',
    loadingWorkspace: 'Eo am-pamakiana ny kaontinao...',
    minDepositWithdrawNotice: 'Fampidirana farany ambany : 15 000 Ar · Famoahana : 3 000 Ar',
    minWithdrawNotice: 'Famoahana farany ambany : 3 000 Ar (Sarany : 10%)',
    noHistory: 'Tsy mbola misy fifanakalozana voarakitra.',
  },
};
