import { useCallback, useEffect, useState } from 'react';
import { db } from '../db/database';

export interface StoredHousehold {
  id: string;
  resourceType: string;
  data: string;
  synced: number;
}

export function useHouseholds() {
  const [households, setHouseholds] = useState<StoredHousehold[]>([]);

  const refresh = useCallback(async () => {
    const data = db.getAllSync<StoredHousehold>(
      `SELECT * FROM resources WHERE resourceType = 'Group' ORDER BY rowid DESC`
    );
    setHouseholds(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    households,
    refresh,
  };
}
