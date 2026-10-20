export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home', icon: 'home' },
  { label: 'Budget', path: '/budget', icon: 'wallet' },
  { label: 'Entries', path: '/entries', icon: 'receipt' },
  { label: 'Reports', path: '/reports', icon: 'chart-bar' },
  { label: 'Credit Card', path: '/credit-card', icon: 'credit-card' },
  { label: 'Profile', path: '/profile', icon: 'user' },
];
