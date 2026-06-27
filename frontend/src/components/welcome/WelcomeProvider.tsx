import { createContext, useContext, useState, type ReactNode } from "react";

interface WelcomeContextType {
  welcomed: boolean;
  completeWelcome: () => void;
}

const WelcomeContext = createContext<WelcomeContextType | undefined>(undefined);

export function WelcomeProvider({ children }: { children: ReactNode }) {
  const [welcomed, setWelcomed] = useState(false);

  const completeWelcome = () => setWelcomed(true);

  return (
    <WelcomeContext.Provider value={{ welcomed, completeWelcome }}>
      {children}
    </WelcomeContext.Provider>
  );
}

export function useWelcome() {
  const ctx = useContext(WelcomeContext);
  if (!ctx) throw new Error("useWelcome must be used inside WelcomeProvider");
  return ctx;
}
