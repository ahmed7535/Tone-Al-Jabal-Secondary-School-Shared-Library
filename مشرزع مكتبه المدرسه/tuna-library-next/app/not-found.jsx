import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page"><div className="card empty"><h2>الصفحة غير موجودة</h2><Link className="btn" href="/">الرئيسية</Link></div></div>
  );
}
