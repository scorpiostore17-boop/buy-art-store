import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCategories, fetchProducts } from '../services/api';

const CatalogContext = createContext(null);
export const useCatalog = () => useContext(CatalogContext);

/** Loads products + categories ONCE and shares them, so pages filter client-side without re-querying. */
export function CatalogProvider({ children }) {
  const [state, setState] = useState({ products: [], categories: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
      setState({ products, categories: categories.filter((c) => c.is_active), loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const value = useMemo(
    () => ({ ...state, reload: load, byId: new Map(state.products.map((p) => [p.id, p])) }),
    [state, load],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
