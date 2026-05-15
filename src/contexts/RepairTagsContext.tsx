import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/services/apiClient';
import { API_CONFIG } from '@/config/api';

export interface RepairTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface RepairTagsContextType {
  tags: RepairTag[];
  loading: boolean;
  addTag: (tag: Omit<RepairTag, 'id'>) => Promise<void>;
  updateTag: (id: string, updates: Partial<RepairTag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  getTag: (id: string) => RepairTag | undefined;
  reload: () => Promise<void>;
}

const TAGS_ENDPOINT = `${API_CONFIG.ENDPOINTS.REPAIRS}/tags`;

const defaultTags: RepairTag[] = [
  { id: '1', name: 'Allied Gold', color: 'blue', description: 'Allied Gold jobs' },
  { id: '2', name: 'Arnold', color: 'yellow', description: 'Arnold jobs' },
  { id: '3', name: 'Awaiting Instructions / Jewellery Draw', color: 'orange', description: 'Awaiting customer instructions' },
  { id: '4', name: 'Bill (Watch Repair)', color: 'yellow', description: 'Watch repair jobs' },
  { id: '5', name: 'Birmingham Stone', color: 'red', description: 'Birmingham Stone jobs' },
  { id: '6', name: 'Booked out to Has', color: 'green', description: 'Booked out items' },
];

const RepairTagsContext = createContext<RepairTagsContextType | undefined>(undefined);

export const RepairTagsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tags, setTags] = useState<RepairTag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<RepairTag[]>(TAGS_ENDPOINT);
      const existing = Array.isArray(data) ? data : [];

      // Seed any default tags missing from the DB (by name)
      const existingNames = new Set(existing.map((t) => t.name.toLowerCase()));
      const missing = defaultTags.filter(
        (t) => !existingNames.has(t.name.toLowerCase())
      );

      if (missing.length > 0) {
        const seeded: RepairTag[] = [];
        for (const tag of missing) {
          try {
            const newTag = await apiClient.post<RepairTag>(TAGS_ENDPOINT, {
              name: tag.name,
              color: tag.color,
              description: tag.description,
            });
            seeded.push(newTag);
          } catch {
            // skip individual failures
          }
        }
        setTags([...existing, ...seeded]);
      } else {
        setTags(existing.length > 0 ? existing : defaultTags);
      }
    } catch {
      // Fallback to localStorage if API unavailable
      const stored = localStorage.getItem('repairTags');
      setTags(stored ? JSON.parse(stored) : defaultTags);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const addTag = async (tag: Omit<RepairTag, 'id'>) => {
    try {
      const newTag = await apiClient.post<RepairTag>(TAGS_ENDPOINT, tag);
      setTags(prev => [...prev, newTag]);
    } catch {
      // Fallback: add locally with temp id
      const temp: RepairTag = { ...tag, id: Date.now().toString() };
      setTags(prev => [...prev, temp]);
    }
  };

  const updateTag = async (id: string, updates: Partial<RepairTag>) => {
    try {
      const updated = await apiClient.put<RepairTag>(`${TAGS_ENDPOINT}/${id}`, updates);
      setTags(prev => prev.map(t => t.id === id ? updated : t));
    } catch {
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  };

  const deleteTag = async (id: string) => {
    try {
      await apiClient.delete(`${TAGS_ENDPOINT}/${id}`);
    } catch {
      // Ignore errors on delete
    }
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const getTag = (id: string) => tags.find(t => t.id === id);

  return (
    <RepairTagsContext.Provider value={{ tags, loading, addTag, updateTag, deleteTag, getTag, reload: loadTags }}>
      {children}
    </RepairTagsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRepairTags = () => {
  const context = useContext(RepairTagsContext);
  if (!context) throw new Error('useRepairTags must be used within RepairTagsProvider');
  return context;
};
