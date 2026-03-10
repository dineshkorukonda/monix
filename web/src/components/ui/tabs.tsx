"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside Tabs.");
  }
  return context;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  return (
    <TabsContext.Provider
      value={{
        value: currentValue,
        setValue: (nextValue) => {
          if (value === undefined) setInternalValue(nextValue);
          onValueChange?.(nextValue);
        },
      }}
    >
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
}) {
  const { value: currentValue, setValue } = useTabs();
  const active = currentValue === value;

  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition-all",
        active
          ? "bg-white text-black"
          : "text-[var(--ink-soft)] hover:bg-white/[0.08] hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
}) {
  const { value: currentValue } = useTabs();
  if (currentValue !== value) return null;
  return <div className={cn("animate-in fade-in-50", className)} {...props} />;
}
