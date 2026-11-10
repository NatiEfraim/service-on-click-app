'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { auditApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

/** The chain check, run on demand (it walks the whole log). */
export function VerifyButton() {
  const [asked, setAsked] = useState(false);
  const verify = useQuery({ queryKey: keys.auditVerify, queryFn: ({ signal }) => auditApi.verify(signal), enabled: asked, staleTime: 0 });
  if (verify.isSuccess) {
    return verify.data.valid ? (
      <span className="chip ok">ההיסטוריה תקינה ({verify.data.checked} רשומות נבדקו)</span>
    ) : (
      <span className="chip bad">נמצא שינוי חשוד ברשומה {verify.data.broken_at}</span>
    );
  }
  return (
    <Button size="sm" icon="check" loading={verify.isFetching} onClick={() => (asked ? void verify.refetch() : setAsked(true))}>
      {verify.isError ? 'הבדיקה נכשלה - נסו שוב' : 'אימות ההיסטוריה'}
    </Button>
  );
}
