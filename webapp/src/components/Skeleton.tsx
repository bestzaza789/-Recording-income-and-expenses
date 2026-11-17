import type { CSSProperties } from 'react';

function Bone({ w = '100%', h = 14, r = 8, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function RowsCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <Bone w={40} h={40} r={20} />
          <span className="skeleton-lines">
            <Bone w="55%" h={13} />
            <Bone w="35%" h={11} />
          </span>
          <Bone w={64} h={14} />
        </div>
      ))}
    </div>
  );
}

/** Placeholder shown while a page's IndexedDB queries resolve. Fades in late so fast loads never flash it. */
export function PageSkeleton({ variant = 'list' }: { variant?: 'dashboard' | 'list' | 'chart' }) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="กำลังโหลด">
      {variant === 'dashboard' ? (
        <>
          <Bone w={110} h={12} />
          <Bone w={230} h={40} r={10} style={{ marginTop: 10 }} />
          <div className="skeleton-cards">
            <Bone w={172} h={108} r={20} />
            <Bone w={172} h={108} r={20} />
          </div>
          <Bone w={120} h={18} style={{ margin: '8px 4px 12px' }} />
          <div className="card skeleton-donut">
            <Bone w={150} h={150} r={75} />
            <span className="skeleton-lines">
              <Bone w="80%" />
              <Bone w="65%" />
              <Bone w="70%" />
            </span>
          </div>
          <Bone w={120} h={18} style={{ margin: '24px 4px 12px' }} />
          <RowsCard rows={3} />
        </>
      ) : (
        <>
          <Bone w={150} h={30} r={10} style={{ margin: '8px 0 20px' }} />
          {variant === 'chart' && (
            <div className="card" style={{ marginBottom: 16 }}>
              <Bone h={220} r={12} />
            </div>
          )}
          <RowsCard rows={variant === 'chart' ? 3 : 5} />
        </>
      )}
    </div>
  );
}

export function SheetLoading() {
  return (
    <div className="modal-overlay">
      <div className="modal-sheet sheet-loading" aria-busy="true" aria-label="กำลังโหลด">
        <span className="loader-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  );
}
