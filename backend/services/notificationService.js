const Notification = require('../models/Notification');

const createNotification = async (userId, { type, title, message, link, meta } = {}) => {
  try {
    await Notification.create({ userId, type, title, message, link: link || '/settlements', meta: meta || {} });
  } catch (err) {
    console.error('Notification create error:', err.message);
  }
};

module.exports = { createNotification };
