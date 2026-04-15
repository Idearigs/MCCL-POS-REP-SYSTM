import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RepairTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface RepairTagsContextType {
  tags: RepairTag[];
  addTag: (tag: Omit<RepairTag, 'id'>) => void;
  updateTag: (id: string, updates: Partial<RepairTag>) => void;
  deleteTag: (id: string) => void;
  getTag: (id: string) => RepairTag | undefined;
  resetToDefaults: () => void;
}

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
  const [tags, setTags] = useState<RepairTag[]>(() => {
    const stored = localStorage.getItem('repairTags');
    return stored ? JSON.parse(stored) : defaultTags;
  });

  useEffect(() => {
    localStorage.setItem('repairTags', JSON.stringify(tags));
  }, [tags]);

  const addTag = (tag: Omit<RepairTag, 'id'>) => {
    const newTag: RepairTag = {
      ...tag,
      id: Date.now().toString(),
    };
    setTags([...tags, newTag]);
  };

  const updateTag = (id: string, updates: Partial<RepairTag>) => {
    setTags(tags.map(tag => tag.id === id ? { ...tag, ...updates } : tag));
  };

  const deleteTag = (id: string) => {
    setTags(tags.filter(tag => tag.id !== id));
  };

  const getTag = (id: string) => {
    return tags.find(tag => tag.id === id);
  };

  const resetToDefaults = () => {
    setTags(defaultTags);
  };

  return (
    <RepairTagsContext.Provider value={{ tags, addTag, updateTag, deleteTag, getTag, resetToDefaults }}>
      {children}
    </RepairTagsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRepairTags = () => {
  const context = useContext(RepairTagsContext);
  if (!context) {
    throw new Error('useRepairTags must be used within RepairTagsProvider');
  }
  return context;
};
