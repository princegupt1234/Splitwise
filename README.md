# 🏠 FlatSplit — Flat Expense Manager

A modern, mobile-first web app for roommates to track shared expenses, calculate who owes what, and settle up easily.

---

## ✨ Features

- **Authentication** — Register, login, logout with JWT
- **Group Management** — Create flat groups, join via unique 8-character code, invite members by username
- **Expense Tracking** — Add expenses with category, split among selected members
- **Balance Calculation** — Auto-calculates who paid what and who owes what
- **Settlement Engine** — Optimized algorithm to minimize transactions between roommates
- **Monthly Reports** — Visual charts (pie + bar) by category and member
- **Dark Mode** — Full dark mode support
- **Mobile-first** — Works great on phones with bottom navigation

---

## 🗂️ Project Structure

```
flat-expense-manager/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js                # JWT protect middleware
│   │   └── errorHandler.js        # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Expense.js
│   │   └── Settlement.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── groups.js
│   │   ├── expenses.js
│   │   ├── settlements.js
│   │   └── reports.js
│   ├── services/
│   │   └── settlementService.js   # Balance calc + settlement algorithm
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/
    │   │   └── index.js           # Axios instance + all API calls
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── index.js       # Avatar, Spinner, Modal, Alert, StatCard...
    │   │   │   └── Layout.js      # App shell with top/bottom nav
    │   │   └── ProtectedRoute.js
    │   ├── context/
    │   │   ├── AuthContext.js
    │   │   └── ThemeContext.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── Groups.js          # Create, Join, Detail
    │   │   ├── AddExpense.js
    │   │   ├── ExpenseHistory.js
    │   │   ├── Settlements.js
    │   │   ├── Reports.js
    │   │   └── Profile.js
    │   ├── utils/
    │   │   └── helpers.js         # formatCurrency, CATEGORY_ICONS, etc.
    │   ├── App.js
    │   ├── index.js
    │   └── index.css              # Tailwind + custom classes
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
git clone <your-repo-url>
cd flat-expense-manager
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flat-expense-manager
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Install dependencies:
```bash
npm install
```

### 3. Setup Frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `.env`:
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
# Terminal 1 (backend)
cd backend && npm run dev

# Terminal 2 (frontend)
cd frontend && npm start
```

**Option B — Run together from root:**
```bash
cd ..   # go to root flat-expense-manager/
npm install
npm run dev
```

App opens at: **http://localhost:3000**
API runs at: **http://localhost:5000**

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

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/group/:groupId?month=6&year=2026` | Monthly report |
| GET | `/api/reports/group/:groupId/summary` | All-time summary |

---

## ⚙️ Settlement Algorithm

The settlement engine uses a **greedy algorithm** to minimize the number of transactions:

1. For every expense, calculate each member's **net balance**:
   - `balance = totalPaid - totalShare`
   - Positive → others owe this person
   - Negative → this person owes others

2. Separate members into **creditors** (positive) and **debtors** (negative)

3. Greedily match the largest debtor with the largest creditor until all balances are zero

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
- Protected routes — all data APIs require valid token
- Mongoose validation on all models
- Input sanitization via express-validator
- MongoDB injection protection via Mongoose

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, React Router v6, Axios, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
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
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

Built with ❤️ for flatmates everywhere 🏠
