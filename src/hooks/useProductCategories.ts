import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { PRODUCT_CATEGORIES } from '../features/inventory/inventorySlice';

export default function useProductCategories() {
    const [categories, setCategories] = useState<string[]>(PRODUCT_CATEGORIES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const reload = useCallback(async () => {
        const request = ++generation.current;
        setLoading(true); setError('');
        try {
            const { data } = await api.get<string[]>('/categories');
            if (request !== generation.current) return;
            const unique = new Map<string, string>();
            data.forEach(name => unique.set(name.toLowerCase(), name));
            setCategories([...unique.values()].sort((a, b) => a.localeCompare(b)));
        } catch {
            if (request === generation.current) setError('Unable to load saved categories. Please retry.');
        } finally { if (request === generation.current) setLoading(false); }
    }, []);
    useEffect(() => {
        const refresh = () => { setCategories(PRODUCT_CATEGORIES); void reload(); };
        refresh();
        window.addEventListener('itemhive-workspace-changed', refresh);
        return () => { ++generation.current; window.removeEventListener('itemhive-workspace-changed', refresh); };
    }, [reload]);
    return { categories, loading, error, reload };
}
