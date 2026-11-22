'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from './Icon';
import { REQ_STATUS, errMsg } from '@/lib/utils';
import { sb } from '@/lib/supabase';

export function Loading() {
  return <div className="loading-box"><span className="spin" /><p>جارٍ التحميل…</p></div>;
}

export function Page({ children }) { return <div className="page">{children}</div>; }

export function PageHead({ title, crumb }) {
  return (
    <div className="page-head"><div><div className="crumb">{crumb}</div><h1>{title}</h1></div></div>
  );
}

export function Gate({ msg }) {
  return (
    <Page>
      <div className="card empty">
        <Icon n="lock" s={42} />
        <h2>{msg || 'يلزم تسجيل الدخول'}</h2>
        <p className="muted">سجّل الدخول أو أنشئ حسابًا للمتابعة.</p>
        <div className="spacer" />
        <Link className="btn" href="/account"><Icon n="user" /> حسابك</Link>
      </div>
    </Page>
  );
}

export function NotFoundCard({ title, href, label }) {
  return (
    <Page>
      <div className="card empty"><h2>{title}</h2>{href && <Link className="btn" href={href}>{label}</Link>}</div>
    </Page>
  );
}

export function ErrorCard({ error, onRetry }) {
  return (
    <Page>
      <div className="card empty">
        <h2>تعذر تحميل الصفحة</h2>
        <p className="muted">{errMsg(error)}</p>
        {onRetry && <button className="btn" type="button" onClick={onRetry}>إعادة المحاولة</button>}
      </div>
    </Page>
  );
}

export function BadgeStatus({ st }) {
  const [t, c] = REQ_STATUS[st] || [st, ''];
  return <span className={'badge ' + c}>{t}</span>;
}

export function Busy({ busy, children }) {
  return busy ? <><span className="spin" /> جارٍ المعالجة…</> : children;
}

export function coverUrl(path) {
  return path ? sb.storage.from('covers').getPublicUrl(path).data.publicUrl : '';
}

/* حقل كلمة المرور مع زر إظهار/إخفاء وأيقونة اختيارية */
export function PwInput({ id, name, icon = 'lock', autoComplete, minLength, value, onChange, className = '', required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="in-wrap pw-wrap">
      <span className="in-ic"><Icon n={icon} s={18} /></span>
      <input id={id} name={name} type={show ? 'text' : 'password'} className={`has-ic ${className}`}
        autoComplete={autoComplete} minLength={minLength} required={required}
        {...(onChange ? { value, onChange } : {})} />
      <button type="button" className={'pw-toggle' + (show ? ' on' : '')}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setShow(s => !s)}>
        <Icon n="eye" s={18} />
      </button>
    </div>
  );
}

export function TextInput({ icon, ...props }) {
  if (!icon) return <input {...props} />;
  return (
    <div className="in-wrap">
      <span className="in-ic"><Icon n={icon} s={18} /></span>
      <input {...props} className={`has-ic ${props.className || ''}`} />
    </div>
  );
}

export function BookCover({ b, size = 40 }) {
  return b.cover_path
    ? <img loading="lazy" src={coverUrl(b.cover_path)} alt={`غلاف ${b.title}`} />
    : <div className="ph"><Icon n="book" s={size} /><span>{b.title}</span></div>;
}
