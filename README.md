# 🏠 FlatSplit — Flat Expense Manager

A modern, mobile-first web app for roommates to track shared expenses, calculate who owes what, and settle up easily.

---

## ✨ Features

- **Authentication** — Register, login, logout with JWT
- **Group Management** — Create flat groups, join via unique 8-character code, invite members by username
- **Expense Tracking** — Add expenses with category, split among selected members
- **Balance Calculation** — Auto-calculates who paid what and who owes what
- **Settlement Engine** — Optimized greedy algorithm to minimize transactions
- **Settlement Requests** — Request, approve, or reject payments with email notifications
- **Budget Alerts** — Set category budgets; get email alerts when exceeded
- **Monthly Reports** — Visual charts (pie + bar) by category and member
- **Notifications** — In-app notification center
- **Admin Panel** — Admin-only routes for user/group management
- **Dark Mode** — Full dark mode support
- **Mobile-first** — Works on phones via bottom navigation; accessible on same Wi-Fi network

---

## 🗂️ Project Structure

```
Splitwise/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── adminAuth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Expense.js
│   │   ├── Settlement.js
│   │   ├── SettlementRequest.js
│   │   ├── Notification.js
│   │   └── Budget.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── groups.js
│   │   ├── expenses.js
│   │   ├── settlements.js
│   │   ├── reports.js
│   │   ├── notifications.js
│   │   ├── budgets.js
│   │   └── admin.js
│   ├── services/
│   │   ├── emailService.js       # Nodemailer — Gmail SMTP
│   │   ├── notificationService.js
│   │   └── settlementService.js  # Balance calc + settlement algorithm
│   ├── .env                      # Your local env (never commit this)
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/
    │   │   └── index.js          # Axios instance + all API calls
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── index.js
    │   │   │   └── Layout.js
    │   │   └── ProtectedRoute.js
    │   ├── context/
    │   │   ├── AuthContext.js
    │   │   └── ThemeContext.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── Groups.js
    │   │   ├── AddExpense.js
    │   │   ├── ExpenseHistory.js
    │   │   ├── Settlements.js
    │   │   ├── Reports.js
    │   │   └── Profile.js
    │   ├── utils/
    │   │   └── helpers.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 1. Clone the repository

```bash
git clone https://github.com/princegupt1234/Splitwise.git
cd Splitwise
```

### 2. Setup Backend

```bash
cd backend
```

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flat-expense-manager
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email (optional — see Email Setup section below)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
```

Install dependencies:

```bash
npm install
```

### 3. Setup Frontend

```bash
cd ../frontend
```

Create a `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Install dependencies:

```bash
npm install
```

### 4. Run both servers

**Option A — Run separately:**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm start
```

**Option B — Run together from root:**

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## 📱 Accessing from Mobile (Same Wi-Fi)

The app supports access from your phone on the same Wi-Fi network without any extra config.

1. Find your PC's local IP — run `ipconfig` on Windows, look for `IPv4 Address` (e.g. `192.168.1.5`)
2. Open `http://192.168.1.5:3000` on your phone's browser
3. The frontend automatically points API calls to the same host, so no changes needed

> Both devices must be on the same Wi-Fi network.

---

## 📧 Email Setup (Gmail SMTP)

The app sends emails for:
- 💸 Settlement payment requests
- ✅ Payment approved notifications
- ❌ Payment rejected notifications
- ⚠️ Budget exceeded alerts

Email is **optional** — the app works fine without it. If `SMTP_USER` or `SMTP_PASS` are not set, emails are silently skipped.

### Step-by-step Gmail setup

**Step 1 — Enable 2-Step Verification on your Google account**

Go to → [myaccount.google.com/security](https://myaccount.google.com/security) → turn on 2-Step Verification.

> This is required before you can create an App Password.

**Step 2 — Generate a Gmail App Password**

1. Go to → [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sign in if prompted
3. Under "App name", type `FlatSplit` (or any name)
4. Click **Create**
5. Copy the 16-character password shown (e.g. `abcd efgh ijkl mnop`)

> This App Password is used instead of your real Gmail password. Remove spaces when pasting.

**Step 3 — Add to your backend `.env`**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**Step 4 — Restart the backend**

```bash
npm run dev
```

You'll see no errors in the console if configured correctly. Emails are sent silently in the background and won't crash the app if they fail.

### Using a different email provider

| Provider | SMTP_HOST | SMTP_PORT |
|----------|-----------|-----------|
| Gmail | smtp.gmail.com | 587 |
| Outlook / Hotmail | smtp-mail.outlook.com | 587 |
| Yahoo Mail | smtp.mail.yahoo.com | 587 |
| Custom / Zoho | smtp.zoho.com | 587 |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group |
| POST | `/api/groups/join` | Join with code |
| GET | `/api/groups` | Get my groups |
| GET | `/api/groups/:id` | Group detail |
| POST | `/api/groups/:id/invite` | Invite by username |
| DELETE | `/api/groups/:id/leave` | Leave group |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Add expense |
| GET | `/api/expenses/group/:groupId` | Get group expenses |
| GET | `/api/expenses/group/:groupId/balances` | Get balances |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settlements/generate/:groupId` | Generate/recalculate |
| GET | `/api/settlements/group/:groupId` | Get settlements |
| PUT | `/api/settlements/:id/settle` | Mark as settled |
| PUT | `/api/settlements/:id/reopen` | Reopen settlement |
| POST | `/api/settlements/:id/request` | Create payment request |
| PUT | `/api/settlements/requests/:requestId/approve` | Approve request |
| PUT | `/api/settlements/requests/:requestId/reject` | Reject request |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/group/:groupId?month=6&year=2026` | Monthly report |
| GET | `/api/reports/group/:groupId/summary` | All-time summary |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets/group/:groupId` | Get budgets |
| POST | `/api/budgets/group/:groupId` | Create budget |
| DELETE | `/api/budgets/:id` | Delete budget |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/read-all/all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

---

## ⚙️ Settlement Algorithm

Uses a **greedy algorithm** to minimize the number of transactions:

1. Calculate each member's net balance: `balance = totalPaid − totalShare`
   - Positive → others owe this person
   - Negative → this person owes others
2. Split into creditors (positive) and debtors (negative)
3. Greedily match largest debtor with largest creditor until all balances are zero

**Example:**
```
Balances:  Prince +925, Aman +425, Rahul -275, Ankit -1075

Settlements:
  Ankit → Prince  ₹925
  Ankit → Aman    ₹150
  Rahul → Aman    ₹275
```

---

## 🔒 Security

- Passwords hashed with **bcrypt** (10 salt rounds)
- **JWT** authentication, 7-day expiry
- All data APIs require a valid token
- Mongoose validation on all models
- Input sanitization via express-validator
- MongoDB injection protection via Mongoose
- CORS whitelists localhost, Vercel deployments, and LAN (192.168.x.x / 10.x.x.x)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, React Router v6, Axios, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| Dev | Nodemon, Concurrently |

---

## 📱 Pages

| Page | Route |
|------|-------|
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/dashboard` |
| Create Group | `/groups/create` |
| Join Group | `/groups/join` |
| Group Detail | `/groups/:id` |
| Add Expense | `/expenses/add` |
| Expense History | `/expenses` |
| Settlements | `/settlements` |
| Reports | `/reports` |
| Profile | `/profile` |

---

## 🔧 Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flat-expense-manager
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

Built with ❤️ for flatmates everywhere 🏠
