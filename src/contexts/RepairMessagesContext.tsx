import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Message template interface
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  description: string;
  status?: string; // Associated repair status
}

// Default message templates matching the user's requirements
const defaultTemplates: MessageTemplate[] = [
  {
    id: 'ready_for_collection',
    name: 'Item Ready for Collection',
    content: 'Hi {CUSTOMER} This is a message from Andrew McCulloch Jewellers Beeston, Just a quick text to say that your item is ready for collection. {RMA}',
    description: 'Sent when repair is ready for customer pickup',
    status: 'READY_FOR_COLLECTION'
  },
  {
    id: 'gold_scan_results',
    name: 'Gold Scan Results',
    content: 'This is a message from McCulloch Jewellers. Your gold scan results are now in and we can offer £ for your items. Should you decide to sell or not Please call in at your convenience to collect.',
    description: 'Sent when offering to buy customer items',
    status: 'QUOTED'
  },
  {
    id: 'feedback_request',
    name: 'Feedback Request',
    content: 'Hi {CUSTOMER} This is a message from McCulloch Jewellers - we would love to hear your feedback on the customer service you recently experienced. Please follow the link https://g.page/r/Cf368lOrcrXxXEAl/review Kind',
    description: 'Request customer feedback after collection',
    status: 'COLLECTED'
  }
];

interface RepairMessagesContextType {
  templates: MessageTemplate[];
  getTemplate: (id: string) => MessageTemplate | undefined;
  getTemplateByStatus: (status: string) => MessageTemplate | undefined;
  updateTemplate: (id: string, content: string) => void;
  resetTemplates: () => void;
}

const RepairMessagesContext = createContext<RepairMessagesContextType | undefined>(undefined);

export const RepairMessagesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    // Load templates from localStorage or use defaults
    const stored = localStorage.getItem('repairMessageTemplates');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stored templates:', error);
        return defaultTemplates;
      }
    }
    return defaultTemplates;
  });

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('repairMessageTemplates', JSON.stringify(templates));
  }, [templates]);

  const getTemplate = (id: string): MessageTemplate | undefined => {
    return templates.find(t => t.id === id);
  };

  const getTemplateByStatus = (status: string): MessageTemplate | undefined => {
    return templates.find(t => t.status === status);
  };

  const updateTemplate = (id: string, content: string) => {
    setTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, content } : t)
    );
  };

  const resetTemplates = () => {
    setTemplates(defaultTemplates);
  };

  return (
    <RepairMessagesContext.Provider value={{
      templates,
      getTemplate,
      getTemplateByStatus,
      updateTemplate,
      resetTemplates
    }}>
      {children}
    </RepairMessagesContext.Provider>
  );
};

export const useRepairMessages = () => {
  const context = useContext(RepairMessagesContext);
  if (context === undefined) {
    throw new Error('useRepairMessages must be used within a RepairMessagesProvider');
  }
  return context;
};
