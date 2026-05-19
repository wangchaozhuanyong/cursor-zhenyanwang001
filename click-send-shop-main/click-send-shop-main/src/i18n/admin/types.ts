export type AdminLocale = "zh" | "en";

export type AdminMessages = {
  layout: {
    title: string;
    searchMenu: string;
    closeMenu: string;
    openMenu: string;
    notifications: string;
    account: string;
    changeSkin: string;
    accountSettings: string;
    changePassword: string;
    logout: string;
    language: string;
    languageZh: string;
    languageEn: string;
    mainNav: string;
    mobileHome: string;
    mobileProducts: string;
    mobileOrders: string;
    mobileNotifications: string;
    mobileMore: string;
    back: string;
  };
  login: {
    title: string;
    subtitle: string;
    accountLabel: string;
    accountPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
    backToStore: string;
    accountPasswordRequired: string;
    loginSuccess: string;
    loginFailed: string;
  };
  skin: {
    title: string;
    titleSystem: string;
    description: string;
    loading: string;
    current: string;
    currentSkin: string;
    switchHint: string;
    selected: string;
  };
  nav: Record<string, string>;
  routeTitles: Record<string, string>;
  common: Record<string, string>;
  status: {
    order: Record<string, string>;
    payment: Record<string, string>;
    return: Record<string, string>;
    export: Record<string, string>;
    orderFilter: Record<string, string>;
    paymentFilter: Record<string, string>;
    returnFilter: Record<string, string>;
    orderTab: Record<string, string>;
    unknownOrder: string;
    unknownPayment: string;
    unknownReturn: string;
  };
  dashboard: Record<string, string>;
};
