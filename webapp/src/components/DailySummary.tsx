import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Category, Transaction } from '../db/db';
import { CategoryIcon } from '../lib/icons';
import { Modal } from './Modal';
import { formatCurrency, formatDate, formatTime } from '../lib/format';
import { categoryFor } from '../lib/lookup';

interface DayTotals {
  day: number;
  expense: number;
  income: number;
  transactions: Transaction[];
}

interface Props {
  // Transactions already filtered to the selected month
  monthTransactions: Transaction[];
  categories: Category[];
  selectedMonth: number;
}

export function DailySummary({ monthTransactions, categories, selectedMonth }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthStart = new Date(selectedMonth);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = useMemo(() => {
    const result: DayTotals[] = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      expense: 0,
      income: 0,
      transactions: [],
    }));
    for (const t of monthTransactions) {
      if (t.transactionType === 'transfer') continue;
      const entry = result[new Date(t.date).getDate() - 1];
      if (t.transactionType === 'expense') entry.expense += t.amount;
      else entry.income += t.amount;
      entry.transactions.push(t);
    }
    for (const d of result) {
      d.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return result;
  }, [monthTransactions, daysInMonth]);

  const totalExpense = days.reduce((s, d) => s + d.expense, 0);

  // For the current month, average only over days that have elapsed so far
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const isFutureMonth = new Date(year, month, 1) > now;
  const daysCounted = isFutureMonth ? 0 : isCurrentMonth ? now.getDate() : daysInMonth;
  const averagePerDay = daysCounted > 0 ? totalExpense / daysCounted : 0;

  const peakDay = days.reduce<DayTotals | null>((max, d) => (d.expense > (max?.expense ?? 0) ? d : max), null);

  const activeDays = days.filter((d) => d.transactions.length > 0).reverse();
  const selected = selectedDay !== null ? days[selectedDay - 1] : null;

  return (
    <>
      <div className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div className="text-secondary-sm">รายจ่ายรวม</div>
          <div style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(totalExpense)}</div>
        </div>
        <div>
          <div className="text-secondary-sm">เฉลี่ยต่อวัน</div>
          <div style={{ fontWeight: 700 }}>{formatCurrency(averagePerDay)}</div>
        </div>
        <div>
          <div className="text-secondary-sm">จ่ายมากสุด</div>
          <div style={{ fontWeight: 700 }}>{peakDay ? `วันที่ ${peakDay.day}` : '-'}</div>
        </div>
      </div>

      {totalExpense > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ marginTop: 0 }}>รายจ่ายแต่ละวัน</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={days} onClick={(e) => {
              const day = Number(e?.activeLabel);
              if (day) setSelectedDay(day);
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip
                labelFormatter={(v) => `วันที่ ${v}`}
                formatter={(v) => [formatCurrency(Number(v)), 'รายจ่าย']}
              />
              <Bar dataKey="expense" fill="var(--red)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeDays.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 16 }}>ไม่มีรายการในเดือนนี้</div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          {activeDays.map((d) => (
            <div
              className="list-item"
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{formatDate(new Date(year, month, d.day))}</div>
                <div className="text-secondary-sm">{d.transactions.length} รายการ</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--red)' }}>-{formatCurrency(d.expense)}</div>
                {d.income > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--green)' }}>+{formatCurrency(d.income)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={formatDate(new Date(year, month, selected.day))} onCancel={() => setSelectedDay(null)}>
          {selected.transactions.length === 0 && <div className="empty-state">ไม่มีรายการในวันนี้</div>}
          {selected.transactions.map((t) => {
            const category = categoryFor(categories, t.categoryId);
            const isExpense = t.transactionType === 'expense';
            return (
              <div className="list-item" key={t.id}>
                <div className="icon-label-row">
                  <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} />
                  <div>
                    <div>{category?.name ?? t.note ?? (isExpense ? 'รายจ่าย' : 'รายรับ')}</div>
                    <div className="text-secondary-sm">
                      {formatTime(t.date)}{category && t.note ? ` · ${t.note}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: isExpense ? 'var(--red)' : 'var(--green)' }}>
                  {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                </div>
              </div>
            );
          })}
          {selected.transactions.length > 0 && (
            <div className="list-item" style={{ borderBottom: 'none' }}>
              <div style={{ fontWeight: 700 }}>รายจ่ายรวมวันนี้</div>
              <div style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(selected.expense)}</div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
