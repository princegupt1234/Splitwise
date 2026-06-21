const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    groupId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group',  required: true },
    category: {
      type: String,
      required: true,
      enum: ['Rent', 'Electricity', 'WiFi', 'Grocery', 'Gas', 'Maid', 'Repair', 'Other'],
    },
    limit:    { type: Number, required: true, min: 1 },
    month:    { type: Number, required: true, min: 1, max: 12 },
    year:     { type: Number, required: true },
    createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

budgetSchema.index({ groupId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
