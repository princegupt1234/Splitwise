const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    from: {       // debtor
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {         // creditor
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {     // original total debt
      type: Number,
      required: true,
      min: 0.01,
    },
    paidAmount: { // total approved payments so far
      type: Number,
      default: 0,
    },
    remainingAmount: { // amount - paidAmount (kept in sync on approval)
      type: Number,
      default: null,   // null = not yet touched; populated on first request approval
    },
    status: {
      type: String,
      enum: ['pending', 'partially_settled', 'settled'],
      default: 'pending',
    },
    settledAt: Date,
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settlement', settlementSchema);
