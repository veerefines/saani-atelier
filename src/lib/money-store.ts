import * as db from './db';
import { priced, type Budget, type CategoryId, type Expense } from './money';

/** Saving Soldi: her spends (collection "expenses") and her budget (money/budget). */
const COL = 'expenses';
const round2 = (n: number) => Math.round(n * 100) / 100;

export const listExpenses = async () => (await db.list<Expense>(COL)).sort((a, b) => (a.day === b.day ? (a.createdAt < b.createdAt ? 1 : -1) : a.day < b.day ? 1 : -1));
export const getExpense = (id: string) => db.get<Expense>(COL, id);
export const removeExpense = (id: string) => db.remove(COL, id);

export function saveExpense(x: Omit<Expense, 'eur' | 'inr'> & Partial<Pick<Expense, 'eur' | 'inr'>>) {
  return db.put<Expense>(COL, { ...x, amount: round2(x.amount), ...priced(x.amount, x.currency, x.rate) });
}
export const newExpenseId = () => db.newId('ex_');

export async function getBudget(): Promise<Budget> {
  return (await db.get<Budget>('money', 'budget')) ?? { id: 'budget', createdAt: new Date().toISOString(), monthly: 0, caps: {} };
}
export async function setBudget(monthly: number, caps: Partial<Record<CategoryId, number>>) {
  const b = await getBudget();
  return db.put<Budget>('money', { ...b, monthly: round2(monthly), caps });
}
