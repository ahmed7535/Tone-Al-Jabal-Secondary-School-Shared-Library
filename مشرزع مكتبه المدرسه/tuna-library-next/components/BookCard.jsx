'use client';
import Link from 'next/link';
import Icon from './Icon';
import { BookCover } from './ui';
import { useApp, useAction } from './AppProvider';

export default function BookCard({ b }) {
  const { favs, toggleFav } = useApp();
  const [busy, run] = useAction();
  const fav = favs.has(b.id);
  return (
    <article className="book">
      <button className={'favbtn' + (fav ? ' on' : '')} type="button" aria-label="المفضلة" disabled={busy}
        onClick={() => run(() => toggleFav(b.id))}><Icon n="heart" s={18} /></button>
      <Link href={`/books/${b.id}`}><div className="cover"><BookCover b={b} /></div></Link>
      <div className="body">
        <h3><Link href={`/books/${b.id}`}>{b.title}</Link></h3>
        <div className="muted" style={{ fontSize: '.88rem' }}>{b.author}</div>
        <div className="row"><span className="badge info">{b.subject}</span><span className="badge">{b.grade}</span></div>
        <div className="muted" style={{ fontSize: '.8rem', marginTop: 'auto' }}><Icon n="eye" s={14} /> {b.views_count} مشاهدة</div>
      </div>
    </article>
  );
}
