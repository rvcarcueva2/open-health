import { useCallback, useEffect, useState } from 'react';
import { db } from '../db/database';

export interface StoredPatient {
  id: string;
  resourceType: string;
  data: string;
  synced: number;
}

export function usePatients() {
  const [patients, setPatients] = useState<StoredPatient[]>([]);

  const refresh = useCallback(async () => {
    const data = db.getAllSync<StoredPatient>(
      `SELECT * FROM resources WHERE resourceType = 'Patient' ORDER BY rowid DESC`
    );
    setPatients(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    patients,
    refresh,
  };
}
