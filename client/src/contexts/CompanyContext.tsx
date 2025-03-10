import React, { createContext, useContext, useState } from 'react';
import { Company } from '../types';

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useSelectedCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useSelectedCompany must be used within a CompanyProvider');
  }
  return context;
}; 