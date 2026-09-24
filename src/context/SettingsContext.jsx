import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchSettings } from '../services/api';
import { readableOn } from '../utils/color';
import { formatMoney } from '../utils/format';

const DEFAULTS = {
  store_name: 'Buy Art',
  logo_url: '',
  primary_color: '#013294',
  secondary_color: '#F2140F',
  accent_color: '#F9E6C7',
  background_color: '#FFFFFF',
  text_color: '#0A1330',
  currency: 'DA',
  low_stock_threshold: 5,
};

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

function applyTheme(s) {
  const r = document.documentElement.style;
  r.setProperty('--primary', s.primary_color);
  r.setProperty('--secondary', s.secondary_color);
  r.setProperty('--accent', s.accent_color);
  r.setProperty('--bg', s.background_color);
  r.setProperty('--text', s.text_color);
  r.setProperty('--on-primary', readableOn(s.primary_color));
  r.setProperty('--on-secondary', readableOn(s.secondary_color));
  r.setProperty('--on-accent', readableOn(s.accent_color));
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setSettings({ ...DEFAULTS, ...Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== null && v !== '')) });
      setState({ loading: false, error: null });
    } catch (e) {
      setState({ loading: false, error: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    applyTheme(settings);
    document.title = settings.store_name;
    const link = document.querySelector('link[rel="icon"]');
    if (link && settings.logo_url) link.href = settings.logo_url;
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      ...state,
      reload: load,
      logoSrc: settings.logo_url || '/logo.png',
      money: (n) => formatMoney(n, settings.currency),
    }),
    [settings, state, load],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
