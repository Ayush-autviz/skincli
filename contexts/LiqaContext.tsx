import React, { createContext, useState, useContext, ReactNode } from 'react';

interface LiqaContextType {
  isLiqaVisible: boolean;
  showLiqa: () => void;
  hideLiqa: () => void;
  onLiqaEvent: ((name: string, payload?: any) => void) | null;
  setOnLiqaEvent: (handler: ((name: string, payload?: any) => void) | null) => void;
  onCloseLiqa: (() => void) | null;
  setOnCloseLiqa: (handler: (() => void) | null) => void;
  liqaKey: number;
  resetLiqa: () => void;
}

const LiqaContext = createContext<LiqaContextType | undefined>(undefined);

export const LiqaProvider = ({ children }: { children: ReactNode }) => {
  const [isLiqaVisible, setIsLiqaVisible] = useState(false);
  const [onLiqaEvent, setOnLiqaEvent] = useState<((name: string, payload?: any) => void) | null>(null);
  const [onCloseLiqa, setOnCloseLiqa] = useState<(() => void) | null>(null);
  const [liqaKey, setLiqaKey] = useState(0);

  const showLiqa = () => setIsLiqaVisible(true);
  const hideLiqa = () => setIsLiqaVisible(false);
  const resetLiqa = () => setLiqaKey(prev => prev + 1);

  return (
    <LiqaContext.Provider
      value={{
        isLiqaVisible,
        showLiqa,
        hideLiqa,
        onLiqaEvent,
        setOnLiqaEvent,
        onCloseLiqa,
        setOnCloseLiqa,
        liqaKey,
        resetLiqa,
      }}
    >
      {children}
    </LiqaContext.Provider>
  );
};

export const useLiqa = () => {
  const context = useContext(LiqaContext);
  if (context === undefined) {
    throw new Error('useLiqa must be used within a LiqaProvider');
  }
  return context;
};
