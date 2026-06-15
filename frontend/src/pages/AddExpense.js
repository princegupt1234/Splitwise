import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, groupAPI } from '../api';
import { Alert, Spinner, Avatar } from '../components/common';
import { CATEGORIES, CATEGORY_ICONS } from '../utils/helpers';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';

const AddExpense = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Grocery',
    paidBy: '',
    splitAmong: [],
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Wait until user is available, then fetch groups
  useEffect(() => {
    if (user?.username) fetchGroups();
  }, [user?.username]);

  const fetchGroups = async () => {
    try {
      const { data } = await groupAPI.getAll();
      setGroups(data.groups);
      if (data.groups.length > 0) {
        const savedId = localStorage.getItem('activeGroupId');
        const group = savedId
          ? data.groups.find((g) => g._id === savedId) || data.groups[0]
          : data.groups[0];
        applyGroup(group);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const applyGroup = (group) => {
    const normalizedMembers = group.members.map((m) => ({
      ...m,
      _id: m._id.toString(),
    }));

    // Find logged-in user by username — avoids ObjectId type mismatch
    const me = normalizedMembers.find((m) => m.username === user.username);
    const myId = me?._id ?? '';

    setActiveGroup(group);
    setMembers(normalizedMembers);
    setForm((prev) => ({
      ...prev,
      groupId: group._id.toString(),
      paidBy: myId,
      splitAmong: normalizedMembers.map((m) => m._id),
    }));
  };

  const handleGroupChange = (groupId) => {
    const g = groups.find((x) => x._id === groupId);
    if (g) applyGroup(g);
  };

  const toggleSplitMember = (memberId) => {
    setForm((prev) => ({
      ...prev,
      splitAmong: prev.splitAmong.includes(memberId)
        ? prev.splitAmong.filter((id) => id !== memberId)
        : [...prev.splitAmong, memberId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.groupId) return setError('Please select a group');
    if (form.splitAmong.length === 0) return setError('Select at least one person to split with');
    if (!form.amount || parseFloat(form.amount) <= 0) return setError('Enter a valid amount');
    setLoading(true);
    try {
      await expenseAPI.create(form);
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  // The logged-in user's member _id — used for (You) label in the split list
  const userId = members.find((m) => m.username === user?.username)?._id ?? '';
  const splitPerPerson =
    form.amount && form.splitAmong.length
      ? (parseFloat(form.amount) / form.splitAmong.length).toFixed(2)
      : 0;

  if (groupsLoading)
    return <Layout><div className="flex justify-center py-20"><Spinner size="lg" /></div></Layout>;

  return (
    <Layout>
      <div className="py-5">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">←</button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Expense</h1>
        </div>

        {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

        {groups.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No groups found. Create or join a group first.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Group selector */}
            {groups.length > 1 && (
              <div>
                <label className="label">Group</label>
                <select
                  className="input-field"
                  value={activeGroup?._id || ''}
                  onChange={(e) => handleGroupChange(e.target.value)}
                >
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div className="card p-5 text-center">
              <label className="label text-center">Amount (₹)</label>
              <div className="flex items-center justify-center">
                <span className="text-3xl font-light text-gray-400 mr-1">₹</span>
                <input
                  type="number"
                  className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none text-center w-full max-w-[200px]"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              {splitPerPerson > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  ₹{splitPerPerson} per person ({form.splitAmong.length} people)
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="label">What was this for?</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Monthly Groceries, Electricity Bill..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="label">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      form.category === cat
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paid by — read-only, always the logged-in user */}
            <div>
              <label className="label">Paid by</label>
              <div className="input-field flex items-center gap-3 cursor-not-allowed opacity-80">
                <Avatar name={user?.name} size="sm" />
                <span className="text-gray-900 dark:text-white font-medium">
                  {user?.name} <span className="text-gray-400 dark:text-gray-500 font-normal">(You)</span>
                </span>
              </div>
            </div>

            {/* Split among */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Split between</label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, splitAmong: members.map((m) => m._id) })}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, splitAmong: [] })}
                    className="text-gray-500 hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {members.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => toggleSplitMember(m._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      form.splitAmong.includes(m._id)
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Avatar name={m.name} size="sm" />
                    <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white">
                      {m.name} {m._id === userId ? '(You)' : ''}
                    </span>
                    {form.splitAmong.includes(m._id)
                      ? <span className="text-primary-600 dark:text-primary-400">✓</span>
                      : <span className="text-gray-300">○</span>
                    }
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading && <Spinner size="sm" />}
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default AddExpense;
