const mongoose = require('mongoose');

const settlementRequestSchema = new mongoose.Schema(
  {
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settlement',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    sender: {           // debtor — person paying
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {         // creditor — person receiving
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,     // base64 data-url stored directly (no file server needed)
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    confirmedAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt:  Date,
    rejectedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SettlementRequest', settlementRequestSchema);
