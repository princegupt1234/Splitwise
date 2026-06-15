import React, { useState, useEffect } from 'react';
import { reportAPI, groupAPI } from '../api';
import { Alert, Spinner, Avatar, EmptyState } from '../components/common';
import { formatCurrency, CATEGORY_ICONS, CATEGORY_COLORS } from '../utils/helpers';
import Layout from '../components/common/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Reports = () => {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

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
        fetchReport(group._id, now.getMonth() + 1, now.getFullYear());
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const fetchReport = async (groupId, m, y) => {
    setLoading(true);
    try {
      const { data } = await reportAPI.getMonthlyReport(groupId, { month: m, year: y });
      setReport(data.report);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (m) => {
    setMonth(m);
    if (activeGroup) fetchReport(activeGroup._id, m, year);
  };

  const handleYearChange = (y) => {
    setYear(y);
    if (activeGroup) fetchReport(activeGroup._id, month, y);
  };

  const pieData = report
    ? Object.entries(report.categoryWise).map(([name, value]) => ({ name, value: Math.round(value) }))
    : [];

  const barData = report?.memberWise?.map((m) => ({
    name: m.name.split(' ')[0],
    Paid: Math.round(m.totalPaid),
    Share: Math.round(m.totalShare),
  })) || [];

  return (
    <Layout>
      <div className="py-5 space-y-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Group tabs */}
        {groups.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {groups.map((g) => (
              <button
                key={g._id}
                onClick={() => { setActiveGroup(g); localStorage.setItem('activeGroupId', g._id); fetchReport(g._id, month, year); }}
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

        {/* Month/Year selector */}
        <div className="flex gap-3">
          <select
            className="input-field flex-1"
            value={month}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="input-field w-28"
            value={year}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
          >
            {[2023, 2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : groups.length === 0 ? (
          <EmptyState icon="🏘️" title="No groups yet" description="Create or join a group to view reports." />
        ) : report?.totalExpenses === 0 ? (
          <EmptyState icon="📊" title="No expenses this month" description="Add expenses to see the monthly report." />
        ) : (
          <>
            {/* Summary */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{MONTHS[month - 1]} {year}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{report?.totalExpenses} expenses · {report?.groupName}</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{formatCurrency(report?.totalExpense)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">total</p>
              </div>
            </div>

            {/* Category chart */}
            {pieData.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Spending by Category</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Category breakdown */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(report?.categoryWise || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${CATEGORY_COLORS[cat]}`}>
                        {CATEGORY_ICONS[cat]}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${(amount / report.totalExpense) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Member chart */}
            {barData.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Member Comparison</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Bar dataKey="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Share" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Member summary */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Member Summary</h3>
              <div className="space-y-4">
                {report?.memberWise?.map((m) => (
                  <div key={m.memberId} className="flex items-start gap-3">
                    <Avatar name={m.name} size="md" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{m.name}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Paid: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(m.totalPaid)}</span>
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Share: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(m.totalShare)}</span>
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${m.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {m.balance >= 0 ? '+' : ''}{formatCurrency(m.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
