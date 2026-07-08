import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getDb } from '@/src/db/client';
import { babies } from '@/src/db/schema';
import { isNull } from 'drizzle-orm';

interface ActiveBabyCtxValue {
  activeBabyId: string | null;
  setActiveBabyId: (id: string | null) => void;
}

const ActiveBabyCtx = createContext<ActiveBabyCtxValue>({
  activeBabyId: null,
  setActiveBabyId: () => {},
});

export function ActiveBabyProvider({ children }: { children: ReactNode }) {
  const [activeBabyId, setActiveBabyId] = useState<string | null>(null);

  useEffect(() => {
    getDb()
      .select({ id: babies.id })
      .from(babies)
      .where(isNull(babies.deletedAt))
      .limit(1)
      .then((res) => {
        if (res.length > 0) setActiveBabyId(res[0].id);
      });
  }, []);

  return (
    <ActiveBabyCtx.Provider value={{ activeBabyId, setActiveBabyId }}>
      {children}
    </ActiveBabyCtx.Provider>
  );
}

export function useActiveBabyCtx() {
  return useContext(ActiveBabyCtx);
}
