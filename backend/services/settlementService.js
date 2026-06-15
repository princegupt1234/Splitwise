/**
 * Settlement Service
 * Calculates optimized settlements using a greedy algorithm
 * to minimize the number of transactions between roommates.
 */

/**
 * Calculate net balances for all members based on expenses,
 * then subtract already-settled payments so they aren't re-generated.
 *
 * @param {Array} expenses       - Expense documents
 * @param {Array} memberIds      - Array of member ObjectId / strings
 * @param {Array} settledPayments - Settlement documents with status 'settled'
 * @returns {Object} { memberId: netBalance }  positive = owed money, negative = owes money
 */
const calculateBalances = (expenses, memberIds, settledPayments = []) => {
  const balances = {};

  memberIds.forEach((id) => {
    balances[id.toString()] = 0;
  });

  // Step 1 — accumulate expense-based balances
  expenses.forEach(({ amount, paidBy, splitAmong }) => {
    const splitCount = splitAmong.length;
    if (splitCount === 0) return;

    const sharePerPerson = amount / splitCount;
    const paidById = paidBy.toString();

    if (balances[paidById] !== undefined) balances[paidById] += amount;

    splitAmong.forEach((memberId) => {
      const id = memberId.toString();
      if (balances[id] !== undefined) balances[id] -= sharePerPerson;
    });
  });

  // Step 2 — subtract settled payments so they don't resurface
  // A settled payment means: `from` already paid `to` that amount.
  // Effect on net balance:
  //   - `from` paid money out  → their balance goes UP   (less they owe)
  //   - `to`   received money  → their balance goes DOWN (less they're owed)
  settledPayments.forEach((s) => {
    const from = s.from.toString();
    const to   = s.to.toString();
    const amt  = s.amount;

    if (balances[from] !== undefined) balances[from] += amt;
    if (balances[to]   !== undefined) balances[to]   -= amt;
  });

  return balances;
};

/**
 * Generate optimized settlement transactions using a greedy algorithm.
 * @param {Object} balances - { memberId: balance }
 * @returns {Array} [{ from, to, amount }]
 */
const generateSettlements = (balances) => {
  const creditors = [];
  const debtors   = [];

  Object.entries(balances).forEach(([id, balance]) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded >  0.01) creditors.push({ id, amount: rounded });
    if (rounded < -0.01) debtors.push({ id, amount: Math.abs(rounded) });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor   = debtors[j];

    const settleAmount    = Math.min(creditor.amount, debtor.amount);
    const roundedAmount   = Math.round(settleAmount * 100) / 100;

    if (roundedAmount > 0.01) {
      settlements.push({ from: debtor.id, to: creditor.id, amount: roundedAmount });
    }

    creditor.amount -= settleAmount;
    debtor.amount   -= settleAmount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount   < 0.01) j++;
  }

  return settlements;
};

const getCategoryWiseSummary = (expenses) => {
  const summary = {};
  expenses.forEach(({ category, amount }) => {
    summary[category] = (summary[category] || 0) + amount;
  });
  return summary;
};

const getMemberWiseSummary = (expenses, members) => {
  const paid  = {};
  const share = {};

  members.forEach((m) => {
    paid[m._id.toString()]  = 0;
    share[m._id.toString()] = 0;
  });

  expenses.forEach(({ amount, paidBy, splitAmong }) => {
    const paidById = paidBy._id ? paidBy._id.toString() : paidBy.toString();
    if (paid[paidById] !== undefined) paid[paidById] += amount;

    const sharePerPerson = amount / splitAmong.length;
    splitAmong.forEach((memberId) => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      if (share[id] !== undefined) share[id] += sharePerPerson;
    });
  });

  return members.map((m) => {
    const id = m._id.toString();
    return {
      memberId:   id,
      name:       m.name,
      username:   m.username,
      totalPaid:  Math.round((paid[id]  || 0) * 100) / 100,
      totalShare: Math.round((share[id] || 0) * 100) / 100,
      balance:    Math.round(((paid[id] || 0) - (share[id] || 0)) * 100) / 100,
    };
  });
};

module.exports = { calculateBalances, generateSettlements, getCategoryWiseSummary, getMemberWiseSummary };
