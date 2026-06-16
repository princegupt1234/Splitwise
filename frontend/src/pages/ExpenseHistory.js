import React, { useState, useEffect } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import { Link } from 'react-router-dom';
import { expenseAPI, groupAPI } from '../api';
import { Alert, Spinner, EmptyState } from '../components/common';
import { formatCurrency, formatDate, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORIES } from '../utils/helpers';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';

const ExpenseHistory = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    try {
      const { data } = await groupAPI.getAll();
      setGroups(data.groups);
      if (data.groups.length > 0) {
        const savedId = localStorage.getItem('activeGroupId');
        const group = savedId ? data.groups.find((g) => g._id === savedId) || data.groups[0] : data.groups[0];
        setActiveGroup(group);
        fetchExpenses(group._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchExpenses = async (groupId, category = '') => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      const { data } = await expenseAPI.getByGroup(groupId, params);
      setExpenses(data.expenses);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (group) => {
    setActiveGroup(group);
    localStorage.setItem('activeGroupId', group._id);
    fetchExpenses(group._id, filterCategory);
  };

  const handleCategoryChange = (cat) => {
    setFilterCategory(cat);
    if (activeGroup) fetchExpenses(activeGroup._id, cat);
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expenseAPI.delete(expenseId);
      setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  return (
    <Layout>
      <div className="py-5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-base)]">Expenses</h1>
          <Link to="/expenses/add" className="btn-primary text-sm px-4 py-2 w-full sm:w-auto text-center">+ Add</Link>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Group tabs */}
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {groups.map((g) => (
              <button
                key={g._id}
                onClick={() => handleGroupChange(g)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                style={activeGroup?._id === g._id
                  ? { background: 'rgba(101,116,243,0.2)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.35)' }
                  : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => handleCategoryChange('')}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
            style={!filterCategory
              ? { background: 'rgba(101,116,243,0.2)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.35)' }
              : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
              style={filterCategory === cat
                ? { background: 'rgba(101,116,243,0.2)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.35)' }
                : { background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Total */}
        {expenses.length > 0 && (
          <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              {filterCategory ? ` in ${filterCategory}` : ''}
            </span>
            <span className="font-bold text-[var(--text-base)]">{formatCurrency(totalAmount)}</span>
          </div>
        )}

        {/* Expense list */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon="🏘️"
            title="No groups yet"
            description="Create or join a group to start tracking expenses."
            action={<Link to="/groups/create" className="btn-primary text-sm">Create Group</Link>}
          />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon="💸"
            title="No expenses yet"
            description="Add your first expense to start tracking."
            action={<Link to="/expenses/add" className="btn-primary text-sm">Add Expense</Link>}
          />
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense._id} className="card p-4">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${CATEGORY_COLORS[expense.category]}`}>
                    {CATEGORY_ICONS[expense.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--text-base)] text-sm truncate">{expense.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#4a4d5e' }}>
                          Paid by {expense.paidBy?._id === user._id ? 'You' : expense.paidBy?.name}
                          {' · '}{formatDate(expense.date)}
                        </p>
                        <p className="text-xs mt-0.5 truncate text-[var(--text-subtle)]">
                          Split: {expense.splitAmong?.map((m) => m._id === user._id ? 'You' : m.name).join(', ')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right sm:text-right ml-0 sm:ml-2 w-full sm:w-auto">
                        <p className="font-bold text-[var(--text-base)]">{formatCurrency(expense.amount)}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          ₹{(expense.amount / (expense.splitAmong?.length || 1)).toFixed(0)}/ea
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {expense.createdBy?._id === user._id && (
                  <div className="flex justify-end mt-3 pt-3 gap-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                    <button
                      onClick={() => handleDelete(expense._id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[32px]"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ExpenseHistory;
