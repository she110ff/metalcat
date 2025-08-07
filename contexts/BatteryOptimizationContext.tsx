import React, { createContext, useContext, ReactNode } from "react";
import {
  useBatteryOptimization,
  BatteryOptimizationSettings,
} from "@/hooks/useBatteryOptimization";

interface BatteryOptimizationContextType {
  settings: BatteryOptimizationSettings;
  isLoading: boolean;
  saveSettings: (
    newSettings: Partial<BatteryOptimizationSettings>
  ) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  toggleBatterySaverMode: () => Promise<boolean>;
  togglePerformanceMode: () => Promise<boolean>;
  loadSettings: () => Promise<void>;
}

const BatteryOptimizationContext = createContext<
  BatteryOptimizationContextType | undefined
>(undefined);

interface BatteryOptimizationProviderProps {
  children: ReactNode;
}

export function BatteryOptimizationProvider({
  children,
}: BatteryOptimizationProviderProps) {
  const batteryOptimization = useBatteryOptimization();

  return (
    <BatteryOptimizationContext.Provider value={batteryOptimization}>
      {children}
    </BatteryOptimizationContext.Provider>
  );
}

export function useBatteryOptimizationContext() {
  const context = useContext(BatteryOptimizationContext);
  if (context === undefined) {
    throw new Error(
      "useBatteryOptimizationContext must be used within a BatteryOptimizationProvider"
    );
  }
  return context;
}
