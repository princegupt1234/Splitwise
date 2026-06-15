import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { expenseAPI, groupAPI } from '../api';
import { Alert, Spinner, Avatar, EmptyState } from '../components/common';
import { formatCurrency, formatDate, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORIES } from '../utils/helpers';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';

const ExpenseHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <Link to="/expenses/add" className="btn-primary text-sm px-4 py-2">+ Add</Link>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Group tabs */}
        {groups.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {groups.map((g) => (
              <button
                key={g._id}
                onClick={() => handleGroupChange(g)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeGroup?._id === g._id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => handleCategoryChange('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !filterCategory ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterCategory === cat ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Total */}
        {expenses.length > 0 && (
          <div className="card p-4 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              {filterCategory ? ` in ${filterCategory}` : ''}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</span>
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
              <div key={expense._id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${CATEGORY_COLORS[expense.category]}`}>
                    {CATEGORY_ICONS[expense.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{expense.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Paid by {expense.paidBy?._id === user._id ? 'You' : expense.paidBy?.name}
                          {' · '}{formatDate(expense.date)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Split: {expense.splitAmong?.map((m) => m._id === user._id ? 'You' : m.name).join(', ')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(expense.amount)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          ₹{(expense.amount / (expense.splitAmong?.length || 1)).toFixed(0)}/ea
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {expense.createdBy?._id === user._id && (
                  <div className="flex justify-end mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 gap-3">
                    <button
                      onClick={() => handleDelete(expense._id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
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
