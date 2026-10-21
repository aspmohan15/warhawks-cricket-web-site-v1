import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Download,
  Filter,
  Search,
  Trash2,
  TrendingDown,
  PieChart,
  Calendar,
  Building2,
  CreditCard
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { exportToCsv } from '../../utils/csv';
import { EXPENSE_CATEGORIES, WARHAWKS_LOGO_URL } from '../../constants';

export const ExpensesView = ({
  tournament,
  expenses,
  onCreateExpense,
  onDeleteExpense
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: 'Ground & Pitch',
    amount: '',
    advanceAmount: '',
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    paymentMode: 'Bank Transfer',
    paymentStatus: 'paid',
    notes: '',
    receiptUrl: ''
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!tournament?.id) {
      setCreateModalOpen(false);
      return;
    }

    const rawTotal = String(form.amount).trim();
    if (rawTotal === '' || isNaN(Number(rawTotal)) || Number(rawTotal) <= 0) {
      alert('Please enter a valid total expense amount (₹).');
      return;
    }
    const totalAmount = Number(rawTotal);

    const rawAdvance = String(form.advanceAmount).trim();
    const advance = rawAdvance === '' ? 0 : Number(rawAdvance);
    if (isNaN(advance) || advance < 0) {
      alert('Advance amount cannot be negative.');
      return;
    }
    if (advance > totalAmount) {
      alert('Advance amount cannot exceed the total expense voucher amount.');
      return;
    }

    onCreateExpense({
      tournamentId: tournament?.id || '',
      title: form.title.trim(),
      category: form.category,
      amount: totalAmount,
      advanceAmount: advance,
      date: form.date,
      vendorName: form.vendorName.trim(),
      paymentMode: form.paymentMode,
      paymentStatus: form.paymentStatus,
      notes: form.notes?.trim() || '',
      receiptUrl: form.receiptUrl || undefined
    });
    setCreateModalOpen(false);
  };

  const handleExportExpenses = () => {
    const rows = expenses.map(e => ({
      Title: e.title,
      Category: e.category,
      'Total Amount (₹)': e.amount,
      'Advance Amount (₹)': e.advanceAmount || 0,
      'Balance Due (₹)': Math.max(0, (e.amount || 0) - (e.advanceAmount || 0)),
      Date: e.date,
      Vendor: e.vendorName,
      PaymentMode: e.paymentMode,
      PaymentStatus: e.paymentStatus,
      Notes: e.notes || ''
    }));
    exportToCsv(`${(tournament?.name || 'Tournament').replace(/\s+/g, '_')}_Expense_Ledger`, rows);
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalAdvanceSum = expenses.reduce((sum, e) => sum + (Number(e.advanceAmount) || 0), 0);
  const totalBalanceDue = Math.max(0, totalExpenseSum - totalAdvanceSum);
  const categoriesList = EXPENSE_CATEGORIES;

  const categoryTotals = categoriesList.map(cat => {
    const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    const percent = totalExpenseSum > 0 ? (total / totalExpenseSum) * 100 : 0;
    return { category: cat, total, percent };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const filteredExpenses = expenses.filter(e => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          💰
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Tournament expenses and financial ledgers belong to an active tournament edition. Select or initialize a tournament edition to manage expense vouchers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-semibold mb-1">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
              <span>Warhawks Treasury</span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-200">Tournament Operations Ledger</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Tournament Expenses & Financial Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade expense recording, category allocations, vendor receipts, and export for {tournament?.name} (Organized by Warhawks).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button
            onClick={handleExportExpenses}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (CSV)</span>
          </button>
          <button
            onClick={() => {
              setForm({
                title: '',
                category: 'Ground & Pitch',
                amount: '',
                advanceAmount: '',
                date: new Date().toISOString().split('T')[0],
                vendorName: '',
                paymentMode: 'Bank Transfer',
                paymentStatus: 'paid',
                notes: '',
                receiptUrl: ''
              });
              setCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Expenses</span>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ₹{totalExpenseSum.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-500">
              (₹{(totalExpenseSum / 100000).toFixed(2)}L)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Advance Paid</span>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              ₹{totalAdvanceSum.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-400">
              disbursed
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Balance Outstanding</span>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700">
              ₹{totalBalanceDue.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-400">
              pending
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Vouchers Paid / Pending</span>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-xl font-bold font-mono text-emerald-700">
              {expenses.filter(e => e.paymentStatus === 'paid').length} Paid
            </span>
            <span className="text-xs font-mono text-amber-700 font-semibold">
              {expenses.filter(e => e.paymentStatus === 'pending').length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Horizontal Stack */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          Budget Allocation by Expense Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {categoryTotals.map(cat => (
            <div key={cat.category} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800 gap-2">
                <span className="truncate">{cat.category}</span>
                <span className="font-mono text-slate-900 shrink-0">₹{(cat.total / 1000).toFixed(0)}k</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1.5">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${cat.percent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {cat.percent.toFixed(1)}% of total expenses
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search expense, vendor, or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Expense Cards (Mobile < 768px) */}
      <div className="md:hidden space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {expenses.length === 0 ? 'No expense vouchers recorded yet.' : 'No expenses found matching filter.'}
          </div>
        ) : (
          filteredExpenses.map(expense => (
            <div
              key={expense.id}
              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pr-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{expense.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {expense.vendorName} · {expense.date}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    ₹{expense.amount.toLocaleString()}
                  </div>
                  {Number(expense.advanceAmount) > 0 && (
                    <div className="text-[10px] font-mono text-emerald-700 font-semibold">
                      Adv: ₹{Number(expense.advanceAmount).toLocaleString()}
                    </div>
                  )}
                  <span className={`text-[10px] font-semibold capitalize ${
                    expense.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {expense.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {expense.category}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">{expense.paymentMode}</span>
                  <button
                    onClick={() => {
                      if (confirm(`Delete expense record "${expense.title}"?`)) {
                        onDeleteExpense(expense.id);
                      }
                    }}
                    className="min-w-[34px] min-h-[34px] p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                    aria-label="Delete Expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Expense Table (md+) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Expense Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-right">Advance (₹)</th>
                <th className="py-3 px-4 text-right">Balance (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    {expenses.length === 0 ? 'No expense vouchers recorded yet.' : 'No expenses found matching filter.'}
                  </td>
                </tr>
              ) : filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{expense.title}</div>
                    {expense.notes && (
                      <div className="text-[11px] text-slate-400 line-clamp-1">{expense.notes}</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {expense.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {expense.vendorName}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {expense.date}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-medium">{expense.paymentMode}</div>
                    <span className={`text-[10px] font-semibold capitalize ${
                      expense.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {expense.paymentStatus}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                    ₹{expense.amount.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-semibold text-xs">
                    {Number(expense.advanceAmount) > 0 ? (
                      `₹${Number(expense.advanceAmount).toLocaleString()}`
                    ) : (
                      <span className="text-slate-400 font-normal">₹0</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-amber-800 font-semibold text-xs">
                    ₹{Math.max(0, expense.amount - (Number(expense.advanceAmount) || 0)).toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete expense record "${expense.title}"?`)) {
                          onDeleteExpense(expense.id);
                        }
                      }}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Tournament Expense Voucher"
        subtitle={`Disbursement ledger entry for ${tournament?.name || 'Tournament Edition'}`}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Expense Title / Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Ground Floodlight Diesel Generator Lease"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                step={1000}
                value={form.amount}
                onChange={e => setForm({ ...form, amount: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payee Vendor / Authority</label>
              <input
                type="text"
                required
                placeholder="Vendor Name"
                value={form.vendorName}
                onChange={e => setForm({ ...form, vendorName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={form.paymentMode}
                onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI Payment</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Cash">Petty Cash Voucher</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Disbursement Status</label>
              <select
                value={form.paymentStatus}
                onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value="paid">Paid (Cleared)</option>
                <option value="pending">Pending Approval / Payment</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Voucher Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Invoice number, tax details, or purchase notes..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Submit Voucher
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
