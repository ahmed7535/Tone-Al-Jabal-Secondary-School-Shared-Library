'use client';
import { errMsg } from '@/lib/utils';

export function AdminError({ error, onRetry }) {
  return (
    <div className="notice err">
      {errMsg(error)} {onRetry && <button className="btn sm ghost" type="button" onClick={onRetry}>إعادة المحاولة</button>}
    </div>
  );
}
