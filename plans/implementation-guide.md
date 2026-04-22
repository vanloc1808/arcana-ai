# Implementation Guide: Admin Dashboard, AI Monitoring & Message Encryption

> Accuracy-first. Every file path, line reference, model field, and schema attribute was
> verified against the actual source before being written here.
>
> **Revision notes (v2):**
> - Fixed unused `from decimal import Decimal` import in subscription stats endpoint
> - Fixed N+1 query in `get_transactions` — added `joinedload`
> - Fixed `AuthContext` description: key must be `useState`, not `useRef`, so consumers re-render
> - Fixed login page guidance: hooks can only be called at component top level, not inside handlers
> - Fixed `body: dict` FastAPI anti-pattern in key-rotation endpoint — replaced with Pydantic model
> - Fixed `conversation_context` design — frontend no longer includes the current message;
>   backend always appends it, eliminating fragile content-equality deduplication
> - Fixed `/auth/me` — it constructs `UserResponse` **explicitly**; you must add `encryption_salt`
>   to that explicit constructor call, it will NOT appear automatically
> - Fixed password-change key rotation: same salt is fine, re-derive key with new password
> - Added existing-user salt generation directly inside the Alembic migration
> - Added Feature 3: AI Usage Monitoring (new model, endpoints, frontend page)

---

## Table of Contents

1. [Feature 1 — Admin Subscription Dashboard](#feature-1--admin-subscription-dashboard)
2. [Feature 2 — Message Encryption at Rest](#feature-2--message-encryption-at-rest)
3. [Feature 3 — AI Usage Monitoring](#feature-3--ai-usage-monitoring)
4. [Testing Checklist](#testing-checklist)

---

## Feature 1 — Admin Subscription Dashboard

### Overview & What Already Exists

**Backend already has:**
- `backend/routers/admin.py` — admin router; existing `GET /admin/dashboard` endpoint at line 74
- `backend/models.py` — `PaymentTransaction` (line ~535), `SubscriptionEvent` (line ~482),
  `TurnUsageHistory` (line ~597) models all exist
- `backend/schemas.py` — `AdminDashboardStats` schema already defined

**Frontend already has:**
- `frontend/src/app/admin/page.tsx` — admin home page; `menuItems` array at line 53
- `frontend/src/app/admin/users/page.tsx` — user management

**What you are adding:**
1. Four new backend endpoints under `/admin/subscriptions/`
2. A new frontend page at `frontend/src/app/admin/subscriptions/page.tsx`

No new database tables are required — all the data already exists.

---

### Backend: New Schemas

**File:** `backend/schemas.py`

Add after the existing admin schemas (search for `class AdminDashboardStats`):

```python
# ---- Admin Subscription Dashboard Schemas ----

class RevenueDataPoint(BaseModel):
    date: str           # ISO date, e.g. "2025-04-01"
    revenue_usd: float
    revenue_eth: float
    transactions: int


class SubscriptionStatusBreakdown(BaseModel):
    status: str
    count: int


class SubscriptionStatsResponse(BaseModel):
    total_revenue_usd: float
    total_revenue_eth: float
    total_turns_sold: int
    total_transactions: int
    transactions_this_month: int
    revenue_this_month_usd: float
    active_subscriptions: int
    subscription_breakdown: list[SubscriptionStatusBreakdown]


class AdminTransactionResponse(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    transaction_type: str
    payment_method: str
    external_transaction_id: str
    amount: str
    currency: str
    product_variant: str
    turns_purchased: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminUserSubscriptionUpdate(BaseModel):
    subscription_status: Optional[str] = None
    add_paid_turns: Optional[int] = None
    set_free_turns: Optional[int] = None
    is_specialized_premium: Optional[bool] = None
```

---

### Backend: New API Endpoints

**File:** `backend/routers/admin.py`

Add these imports at the top (merge with existing imports — don't duplicate):

```python
from sqlalchemy.orm import joinedload          # new
from models import PaymentTransaction          # new — SubscriptionEvent and TurnUsageHistory
                                               # can be added alongside as you need them
from schemas import (
    # ... keep all existing imports ...
    SubscriptionStatsResponse,
    RevenueDataPoint,
    AdminTransactionResponse,
    AdminUserSubscriptionUpdate,
    SubscriptionStatusBreakdown,
)
```

Add the four endpoints below, after the existing dashboard endpoint (after line ~145):

---

#### Endpoint 1 — Aggregate subscription stats

```python
@router.get("/subscriptions/stats", response_model=SubscriptionStatsResponse)
async def get_subscription_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """Aggregate revenue and subscription counts."""
    completed_txns = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.status == "completed")
        .all()
    )

    total_usd = sum(float(t.amount) for t in completed_txns if t.currency == "USD")
    total_eth = sum(float(t.amount) for t in completed_txns if t.currency == "ETH")
    total_turns = sum(t.turns_purchased for t in completed_txns)

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month = [t for t in completed_txns if t.created_at.replace(tzinfo=None) >= month_start]
    revenue_month_usd = sum(float(t.amount) for t in this_month if t.currency == "USD")

    breakdown_rows = (
        db.query(User.subscription_status, func.count(User.id))
        .group_by(User.subscription_status)
        .all()
    )
    breakdown = [
        SubscriptionStatusBreakdown(status=row[0] or "none", count=row[1])
        for row in breakdown_rows
    ]
    active_count = next((b.count for b in breakdown if b.status == "active"), 0)

    return SubscriptionStatsResponse(
        total_revenue_usd=round(total_usd, 2),
        total_revenue_eth=round(total_eth, 6),
        total_turns_sold=total_turns,
        total_transactions=len(completed_txns),
        transactions_this_month=len(this_month),
        revenue_this_month_usd=round(revenue_month_usd, 2),
        active_subscriptions=active_count,
        subscription_breakdown=breakdown,
    )
```

> **Timezone note:** `PaymentTransaction.created_at` is stored timezone-aware. The comparison
> `t.created_at.replace(tzinfo=None)` strips the timezone for a naive-vs-naive comparison against
> `month_start` (which is naive, matching how the rest of the codebase uses `datetime.utcnow()`).

---

#### Endpoint 2 — Revenue over time (line chart data)

```python
@router.get("/subscriptions/revenue-over-time", response_model=list[RevenueDataPoint])
async def get_revenue_over_time(
    days: int = 30,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 1 and 365")

    cutoff = datetime.utcnow() - timedelta(days=days)
    txns = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.status == "completed",
            PaymentTransaction.created_at >= cutoff,
        )
        .order_by(PaymentTransaction.created_at.asc())
        .all()
    )

    # Pre-fill every date in the range so the chart has no gaps
    data: dict[str, dict] = {}
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).date()
        data[str(d)] = {"revenue_usd": 0.0, "revenue_eth": 0.0, "transactions": 0}

    for t in txns:
        key = str(t.created_at.date())
        if key in data:
            if t.currency == "USD":
                data[key]["revenue_usd"] += float(t.amount)
            elif t.currency == "ETH":
                data[key]["revenue_eth"] += float(t.amount)
            data[key]["transactions"] += 1

    return [
        RevenueDataPoint(
            date=date_str,
            revenue_usd=round(v["revenue_usd"], 2),
            revenue_eth=round(v["revenue_eth"], 6),
            transactions=v["transactions"],
        )
        for date_str, v in data.items()
    ]
```

---

#### Endpoint 3 — Paginated transaction list

```python
@router.get("/subscriptions/transactions", response_model=list[AdminTransactionResponse])
async def get_transactions(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    # joinedload avoids N+1 queries when accessing t.user.username below
    txns = (
        db.query(PaymentTransaction)
        .options(joinedload(PaymentTransaction.user))
        .order_by(PaymentTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        AdminTransactionResponse(
            id=t.id,
            user_id=t.user_id,
            username=t.user.username,
            email=t.user.email,
            transaction_type=t.transaction_type,
            payment_method=t.payment_method,
            external_transaction_id=t.external_transaction_id,
            amount=t.amount,
            currency=t.currency,
            product_variant=t.product_variant,
            turns_purchased=t.turns_purchased,
            status=t.status,
            created_at=t.created_at,
        )
        for t in txns
    ]
```

---

#### Endpoint 4 — Update a user's subscription

> The existing `PATCH /admin/users/{user_id}` endpoint only handles `is_active`, `is_admin`,
> `is_specialized_premium`, and `favorite_deck_id`. Add a separate endpoint for subscription
> management so the concerns stay separated.

```python
@router.patch("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: int,
    update: AdminUserSubscriptionUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = []

    if update.subscription_status is not None:
        user.subscription_status = update.subscription_status
        changes.append(f"subscription_status={update.subscription_status}")

    if update.add_paid_turns is not None and update.add_paid_turns > 0:
        user.add_paid_turns(update.add_paid_turns)   # method exists on User model (models.py line 163)
        changes.append(f"added {update.add_paid_turns} paid turns")

    if update.set_free_turns is not None:
        user.number_of_free_turns = update.set_free_turns
        changes.append(f"set free_turns={update.set_free_turns}")

    if update.is_specialized_premium is not None:
        user.is_specialized_premium = update.is_specialized_premium
        changes.append(f"is_specialized_premium={update.is_specialized_premium}")

    db.commit()
    db.refresh(user)

    return {
        "message": f"User {user_id} updated: {', '.join(changes) if changes else 'no changes'}",
        "user_id": user_id,
        "subscription_status": user.subscription_status,
        "number_of_free_turns": user.number_of_free_turns,
        "number_of_paid_turns": user.number_of_paid_turns,
        "is_specialized_premium": user.is_specialized_premium,
    }
```

---

### Frontend: Install recharts

`recharts` is not in `frontend/package.json`. Install it from the `frontend/` directory:

```bash
cd frontend
npm install recharts
```

TypeScript types are bundled with recharts — no `@types/recharts` needed.

---

### Frontend: Add Navigation Link

**File:** `frontend/src/app/admin/page.tsx`

Import `CreditCard` from lucide-react (line 6 already imports from lucide-react — add to that
import). Then add one entry to `menuItems` (around line 53):

```tsx
import { Menu, X, Users, Package, FileImage, MessageSquare, Grid, Share, CreditCard } from 'lucide-react';

const menuItems = [
    { href: '/admin/users',            label: 'Users',           icon: Users },
    { href: '/admin/decks',            label: 'Decks',           icon: Package },
    { href: '/admin/cards',            label: 'Cards',           icon: FileImage },
    { href: '/admin/chat-sessions',    label: 'Chat Sessions',   icon: MessageSquare },
    { href: '/admin/spreads',          label: 'Spreads',         icon: Grid },
    { href: '/admin/shared-readings',  label: 'Shared Readings', icon: Share },
    { href: '/admin/subscriptions',    label: 'Subscriptions',   icon: CreditCard },   // NEW
]
```

---

### Frontend: Build the Subscription Dashboard Page

**File to create:** `frontend/src/app/admin/subscriptions/page.tsx`

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell,
} from 'recharts';

// ---- Types ----

interface SubscriptionStats {
    total_revenue_usd: number;
    total_revenue_eth: number;
    total_turns_sold: number;
    total_transactions: number;
    transactions_this_month: number;
    revenue_this_month_usd: number;
    active_subscriptions: number;
    subscription_breakdown: { status: string; count: number }[];
}

interface RevenueDataPoint {
    date: string;
    revenue_usd: number;
    revenue_eth: number;
    transactions: number;
}

interface Transaction {
    id: number;
    user_id: number;
    username: string;
    email: string;
    transaction_type: string;
    payment_method: string;
    external_transaction_id: string;
    amount: string;
    currency: string;
    product_variant: string;
    turns_purchased: number;
    status: string;
    created_at: string;
}

// ---- Stat Card ----

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="bg-gray-800 border border-purple-700/50 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-purple-400 mt-1">{sub}</p>}
        </div>
    );
}

// ---- User Subscription Editor ----

function UserSubscriptionEditor() {
    const [userId, setUserId]     = useState('');
    const [status, setStatus]     = useState('');
    const [addTurns, setAddTurns] = useState('');
    const [freeTurns, setFreeTurns] = useState('');
    const [premium, setPremium]   = useState<boolean | null>(null);
    const [result, setResult]     = useState<string | null>(null);
    const [saving, setSaving]     = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setSaving(true);
        setResult(null);
        try {
            const body: Record<string, unknown> = {};
            if (status)              body.subscription_status   = status;
            if (addTurns)            body.add_paid_turns         = parseInt(addTurns);
            if (freeTurns)           body.set_free_turns         = parseInt(freeTurns);
            if (premium !== null)    body.is_specialized_premium = premium;

            const res = await api.patch(`/admin/users/${userId}/subscription`, body);
            setResult(res.data.message);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Update failed';
            setResult(`Error: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-gray-800 border border-purple-700/50 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Update User Subscription</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="text-xs text-gray-400">User ID</label>
                    <input type="number" value={userId} onChange={e => setUserId(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        placeholder="e.g. 42" required />
                </div>
                <div>
                    <label className="text-xs text-gray-400">Subscription Status (leave blank to skip)</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                        <option value="">— no change —</option>
                        <option value="active">active</option>
                        <option value="none">none</option>
                        <option value="canceled">canceled</option>
                        <option value="expired">expired</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-400">Add Paid Turns</label>
                        <input type="number" min="0" value={addTurns} onChange={e => setAddTurns(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            placeholder="e.g. 10" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Set Free Turns</label>
                        <input type="number" min="0" value={freeTurns} onChange={e => setFreeTurns(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            placeholder="e.g. 3" />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-gray-400">Specialized Premium</label>
                    <select
                        value={premium === null ? '' : String(premium)}
                        onChange={e => setPremium(e.target.value === '' ? null : e.target.value === 'true')}
                        className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                        <option value="">— no change —</option>
                        <option value="true">Enable</option>
                        <option value="false">Disable</option>
                    </select>
                </div>
                <button type="submit" disabled={saving}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors">
                    {saving ? 'Saving…' : 'Apply Changes'}
                </button>
                {result && (
                    <p className={`text-sm mt-2 ${result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                        {result}
                    </p>
                )}
            </form>
        </div>
    );
}

// ---- Main Page ----

const STATUS_COLORS: Record<string, string> = {
    active:   '#22c55e',
    none:     '#6b7280',
    canceled: '#ef4444',
    expired:  '#f97316',
    past_due: '#eab308',
};

export default function SubscriptionDashboard() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats]             = useState<SubscriptionStats | null>(null);
    const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading]         = useState(true);
    const [chartDays, setChartDays]     = useState(30);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated || !user?.is_admin) {
            router.push(isAuthenticated ? '/' : '/login');
        }
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, revenueRes, txnRes] = await Promise.all([
                api.get('/admin/subscriptions/stats'),
                api.get(`/admin/subscriptions/revenue-over-time?days=${chartDays}`),
                api.get('/admin/subscriptions/transactions?limit=20&offset=0'),
            ]);
            setStats(statsRes.data);
            setRevenueData(revenueRes.data);
            setTransactions(txnRes.data);
        } catch (err) {
            console.error('Failed to load subscription data', err);
        } finally {
            setLoading(false);
        }
    }, [chartDays]);

    // Runs when auth resolves and when chartDays changes (loadData is recreated by useCallback)
    useEffect(() => {
        if (isAuthenticated && user?.is_admin) loadData();
    }, [isAuthenticated, user, loadData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 p-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Subscription Dashboard</h1>
                        <p className="text-gray-400 mt-1">Revenue, subscriptions, and transaction history</p>
                    </div>
                    <button onClick={() => router.push('/admin')}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                        ← Back to Admin
                    </button>
                </div>

                {/* Stat Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Total Revenue (USD)"
                            value={`$${stats.total_revenue_usd.toFixed(2)}`}
                            sub={`$${stats.revenue_this_month_usd.toFixed(2)} this month`} />
                        <StatCard label="Total Revenue (ETH)"
                            value={`${stats.total_revenue_eth.toFixed(4)} ETH`} />
                        <StatCard label="Active Subscriptions"
                            value={String(stats.active_subscriptions)} />
                        <StatCard label="Turns Sold"
                            value={String(stats.total_turns_sold)}
                            sub={`${stats.transactions_this_month} txns this month`} />
                    </div>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

                    {/* Revenue Line Chart */}
                    <div className="xl:col-span-2 bg-gray-800 border border-purple-700/50 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Daily Revenue (USD)</h2>
                            <select value={chartDays} onChange={e => setChartDays(Number(e.target.value))}
                                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    tickFormatter={d => d.slice(5)} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #6b21a8' }}
                                    labelStyle={{ color: '#e5e7eb' }} />
                                <Legend />
                                <Line type="monotone" dataKey="revenue_usd" stroke="#a855f7"
                                    strokeWidth={2} dot={false} name="USD Revenue" />
                                <Line type="monotone" dataKey="transactions" stroke="#f59e0b"
                                    strokeWidth={2} dot={false} name="Transactions" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Subscription Status Bar Chart */}
                    {stats && (
                        <div className="bg-gray-800 border border-purple-700/50 rounded-xl p-5">
                            <h2 className="text-lg font-semibold text-white mb-4">Subscription Status</h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={stats.subscription_breakdown} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis dataKey="status" type="category"
                                        tick={{ fill: '#9ca3af', fontSize: 11 }} width={70} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #6b21a8' }}
                                        labelStyle={{ color: '#e5e7eb' }} />
                                    <Bar dataKey="count" name="Users">
                                        {stats.subscription_breakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`}
                                                fill={STATUS_COLORS[entry.status] ?? '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Transactions + Editor Row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Transactions Table */}
                    <div className="xl:col-span-2 bg-gray-800 border border-purple-700/50 rounded-xl overflow-hidden">
                        <div className="p-5 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-700/50">
                                    <tr>
                                        {['ID','User','Method','Amount','Turns','Status','Date'].map(h => (
                                            <th key={h} className="px-4 py-3 text-gray-400 font-medium">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                                            <td className="px-4 py-3 text-gray-400">#{t.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium">{t.username}</div>
                                                <div className="text-gray-400 text-xs">{t.email}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 capitalize">
                                                {t.payment_method.replace(/_/g, ' ')}
                                            </td>
                                            <td className="px-4 py-3 text-white font-medium">
                                                {t.amount} {t.currency}
                                            </td>
                                            <td className="px-4 py-3 text-purple-400">{t.turns_purchased}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                    t.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                                                    t.status === 'failed'    ? 'bg-red-900/50 text-red-400' :
                                                    'bg-yellow-900/50 text-yellow-400'
                                                }`}>{t.status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                No transactions found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <UserSubscriptionEditor />
                </div>

            </div>
        </div>
    );
}
```

---

## Feature 2 — Message Encryption at Rest

### Overview & Threat Model

**What this protects against:** Someone who reads the database directly — a raw DB dump,
a backup, or direct SQL access — cannot read user message content.

**What this does NOT protect against:** The server process seeing plaintext during a request
(the AI must read the content), or network interception (HTTPS handles that).

**In plain terms:** After this is implemented, the `messages` table shows ciphertext for user
messages. Only someone who knows the user's password can derive the decryption key.

---

### Architecture

The core conflict: `backend/routers/chat.py` lines 879–888 fetches all previous messages
from the DB and sends them to the LLM as context. If those messages are stored as ciphertext,
the AI breaks.

**Solution — "encrypted storage, plaintext transit":**

1. The browser derives an AES-256-GCM encryption key from the user's password using PBKDF2
   (Web Crypto API). The key **never leaves the browser**.
2. When sending a message, the browser sends:
   - `content` — plaintext (used by the server for AI; not persisted)
   - `encrypted_content` — AES-GCM ciphertext (persisted in the DB)
   - `conversation_context` — the prior conversation history (decrypted) for the LLM to use
     **instead of** fetching from the DB
3. The server uses `content` for the AI and `conversation_context` for history.
   It stores only `encrypted_content`.
4. When the user loads message history, the server returns the ciphertext; the browser decrypts.
5. AI responses (role=`assistant`) are stored as plaintext — they are system-generated output.

---

### Backend: Database Changes

**File:** `backend/models.py`

**1. Add `encryption_salt` to the `User` model.**
The `User` class ends its column definitions around line 62 (`avatar_filename`). Add after it:

```python
# In class User, after avatar_filename = Column(...):
encryption_salt = Column(String, nullable=True)  # hex 64-char salt for PBKDF2
```

**2. Add two columns to the `Message` model.**
The `Message` class has column definitions ending around line 234. Add after `chat_session_id`:

```python
# In class Message, after chat_session_id = Column(...):
encrypted_content = Column(String, nullable=True)   # AES-256-GCM ciphertext, "iv:ciphertext" base64
is_encrypted      = Column(Boolean, default=False, nullable=False)
```

---

### Backend: Alembic Migration

From the `backend/` directory:

```bash
alembic revision --autogenerate -m "add_message_encryption_and_user_salt"
```

Verify the generated file in `backend/alembic/versions/`. The `upgrade()` function should contain
the three column additions **and** a loop to generate salts for existing users. If autogenerate
only creates the columns, add the salt-generation loop manually:

```python
import secrets
from sqlalchemy import text

def upgrade() -> None:
    op.add_column('users',
        sa.Column('encryption_salt', sa.String(), nullable=True))
    op.add_column('messages',
        sa.Column('encrypted_content', sa.String(), nullable=True))
    op.add_column('messages',
        sa.Column('is_encrypted', sa.Boolean(), nullable=False, server_default='false'))

    # Generate a salt for every existing user so they get encryption on their next login.
    # Their existing messages stay as plaintext (is_encrypted=False); only new messages
    # sent after re-login will be encrypted.
    conn = op.get_bind()
    users = conn.execute(text("SELECT id FROM users WHERE encryption_salt IS NULL")).fetchall()
    for (user_id,) in users:
        salt = secrets.token_hex(32)
        conn.execute(
            text("UPDATE users SET encryption_salt = :salt WHERE id = :id"),
            {"salt": salt, "id": user_id},
        )


def downgrade() -> None:
    op.drop_column('messages', 'is_encrypted')
    op.drop_column('messages', 'encrypted_content')
    op.drop_column('users', 'encryption_salt')
```

Then apply:

```bash
python migrate.py
```

---

### Backend: Schema Changes

**File:** `backend/schemas.py`

**1. Replace `MessageRequest`** (currently around line 243):

```python
class MessageRequest(BaseModel):
    """Schema for sending a message."""

    content: str  # Plaintext — used for AI; NOT persisted when is_encrypted=True
    encrypted_content: Optional[str] = None   # AES-256-GCM ciphertext, format: "base64iv:base64ct"
    is_encrypted: bool = False
    # Prior conversation turns (decrypted) sent by the client.
    # When present, the backend uses this instead of fetching from DB.
    # Does NOT include the current message — the backend appends content itself.
    # Each entry: {"role": "user"|"assistant", "content": "<plaintext>"}
    conversation_context: Optional[list[dict]] = None

    @field_validator("content")
    def validate_content(cls, v):
        return _sanitize_string(v, "Message content", min_length=1, max_length=2000)
```

**2. Replace `MessageResponse`** (currently around line 264):

```python
class MessageResponse(BaseModel):
    """Response schema for a message."""

    id: int
    role: str
    content: str                                  # "[encrypted]" placeholder for encrypted user messages
    encrypted_content: Optional[str] = None       # Ciphertext returned to client for decryption
    is_encrypted: bool = False
    created_at: datetime
    cards: list[Card] | None = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}
```

**3. Add `encryption_salt` to `UserResponse`** (search for `class UserResponse`).
Add the field:

```python
encryption_salt: Optional[str] = None
```

---

### Backend: Auth Router Changes

**File:** `backend/routers/auth.py`

> `secrets` is **already imported** at line 2 — do not add a duplicate import.

**1. Generate salt on registration.**
The `register` endpoint is at line 217. The user object is created at line 268:

```python
db_user = User(username=user.username, email=user.email)
db_user.password = user.password  # line 269
```

Add one line immediately after line 269:

```python
db_user.encryption_salt = secrets.token_hex(32)   # 64 hex chars = 32 bytes
```

Then `db.add(db_user)` at line 270 picks it up automatically.

**2. Expose the salt in `/auth/me`.**
The `get_current_user_profile` function at line 548 constructs `UserResponse` **explicitly**
(lines 582–598) — it does NOT use `from_orm`. You must add `encryption_salt` to that
constructor call:

```python
user_response = UserResponse(
    id=current_user.id,
    username=current_user.username,
    email=current_user.email,
    full_name=current_user.full_name,
    created_at=current_user.created_at,
    is_active=current_user.is_active,
    is_admin=current_user.is_admin,
    is_specialized_premium=current_user.is_specialized_premium,
    favorite_deck_id=current_user.favorite_deck_id,
    favorite_deck=DeckResponse.model_validate(favorite_deck) if favorite_deck else None,
    lemon_squeezy_customer_id=current_user.lemon_squeezy_customer_id,
    subscription_status=current_user.subscription_status,
    number_of_free_turns=current_user.number_of_free_turns,
    number_of_paid_turns=current_user.number_of_paid_turns,
    last_free_turns_reset=current_user.last_free_turns_reset,
    avatar_url=avatar_url,
    encryption_salt=current_user.encryption_salt,   # ADD THIS LINE
)
```

---

### Backend: Chat Router Changes

**File:** `backend/routers/chat.py`

**Target function:** `create_message` (line 738), specifically the inner async generator
`generate_streaming_response`.

**Change 1 — save user message** (around line 826–828):

```python
# BEFORE:
user_message = Message(chat_session_id=session_id, content=message_request.content, role="user")

# AFTER:
if message_request.is_encrypted and message_request.encrypted_content:
    user_message = Message(
        chat_session_id=session_id,
        content="[encrypted]",
        encrypted_content=message_request.encrypted_content,
        is_encrypted=True,
        role="user",
    )
else:
    user_message = Message(
        chat_session_id=session_id,
        content=message_request.content,
        is_encrypted=False,
        role="user",
    )
```

**Change 2 — build LLM context** (around lines 879–888).

Replace the block that fetches messages from DB:

```python
# BEFORE:
db_messages_for_context = (
    db.query(Message)
    .filter(Message.chat_session_id == session_id)
    .order_by(Message.created_at.asc())
    .all()
)
messages_for_llm = [{"role": "system", "content": system_message_content}]
for msg in db_messages_for_context:
    messages_for_llm.append({"role": msg.role, "content": msg.content})

# AFTER:
messages_for_llm = [{"role": "system", "content": system_message_content}]

if message_request.conversation_context is not None:
    # Client provides decrypted prior history — use it directly.
    # conversation_context does NOT include the current message; we append it below.
    for ctx_msg in message_request.conversation_context:
        role    = ctx_msg.get("role", "")
        content = ctx_msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages_for_llm.append({"role": role, "content": content})
    # Always append the current plaintext message last.
    messages_for_llm.append({"role": "user", "content": message_request.content})
else:
    # Fallback: fetch from DB (unencrypted sessions or old clients).
    db_messages_for_context = (
        db.query(Message)
        .filter(Message.chat_session_id == session_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    for msg in db_messages_for_context:
        messages_for_llm.append({"role": msg.role, "content": msg.content})
    # Note: the current message is already the last row (it was committed before this generator runs).
```

> **Why conversation_context excludes the current message:** The current message was already saved
> to DB before the generator started. In the DB-fallback path, it appears naturally as the last
> row. In the context path, we always append `message_request.content` explicitly. This avoids
> fragile content-equality deduplication.

---

### Frontend: Crypto Utilities

**Create new file:** `frontend/src/lib/crypto.ts`

```typescript
/**
 * AES-256-GCM encryption using Web Crypto API.
 * Key is derived via PBKDF2 and never leaves the browser.
 * Ciphertext format: "base64(12-byte IV):base64(ciphertext+GCM-tag)"
 */

const ALGORITHM       = 'AES-GCM';
const KEY_LENGTH      = 256;
const PBKDF2_ITER     = 200_000;
const IV_BYTES        = 12;

function hexToBytes(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return out;
}

/**
 * Derive an AES-256-GCM CryptoKey from password + server-stored salt.
 * Call this immediately after login, before the password variable is cleared.
 */
export async function deriveEncryptionKey(
    password: string,
    saltHex: string,
): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITER, hash: 'SHA-256' },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,           // non-extractable: key cannot be exported
        ['encrypt', 'decrypt'],
    );
}

/** Encrypt plaintext. Returns "base64(iv):base64(ciphertext)". */
export async function encryptMessage(key: CryptoKey, plaintext: string): Promise<string> {
    const enc  = new TextEncoder();
    const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ct   = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, enc.encode(plaintext));
    const toB64 = (buf: ArrayBuffer | Uint8Array) =>
        btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer)));
    return `${toB64(iv)}:${toB64(ct)}`;
}

/** Decrypt a string produced by encryptMessage. Returns null on any failure. */
export async function decryptMessage(key: CryptoKey, encrypted: string): Promise<string | null> {
    try {
        const [ivB64, ctB64] = encrypted.split(':');
        if (!ivB64 || !ctB64) return null;
        const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
        const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
        const pt = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ct);
        return new TextDecoder().decode(pt);
    } catch {
        return null;
    }
}
```

---

### Frontend: AuthContext Changes

**File:** `frontend/src/contexts/AuthContext.tsx`

The encryption key must be held in **`useState`** (not `useRef`). `useState` causes consumers
like `useChatSessions` to re-render when the key is set after login. `useRef` would not.

**1. Update `AuthContextType` interface** (around line 19):

```typescript
interface AuthContextType {
    token: string | null;
    refreshToken: string | null;
    user: User | null;
    setTokens: (accessToken: string | null, refreshToken: string | null) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    refreshUser: () => Promise<void>;
    encryptionKey: CryptoKey | null;         // NEW
    setEncryptionKey: (key: CryptoKey | null) => void;  // NEW
}
```

**2. Add the state inside `AuthProvider`** (after the existing `useState` declarations):

```typescript
const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
```

**3. Clear the key on logout** — add to the `logout` callback (around line 39):

```typescript
setEncryptionKey(null);
```

**4. Expose via context value** — find `<AuthContext.Provider value={...}>` and add:

```typescript
encryptionKey,
setEncryptionKey,
```

---

### Frontend: Login Page Changes

**File:** `frontend/src/app/login/page.tsx`

> React hooks must be called at the **top level** of the component — never inside event handlers.
> Add the `useAuth` destructure at the component top level (where other hooks are called), then
> use `setEncryptionKey` inside the submit handler.

**At the component top level** (alongside existing `useAuth`, `useRouter`, etc. calls):

```typescript
import { deriveEncryptionKey } from '@/lib/crypto';

// Inside the component, at top level:
const { setTokens, setEncryptionKey } = useAuth();  // add setEncryptionKey here
```

**Inside the submit handler**, after `setTokens(...)` succeeds:

```typescript
// Capture password in a local variable before any async gap (React may batch state updates)
const capturedPassword = password;   // 'password' is your form state variable

try {
    // The login endpoint (/auth/token) returns only tokens, not user data.
    // Fetch the profile to get the salt.
    const profileRes = await api.get('/auth/me');
    const salt: string | undefined = profileRes.data.encryption_salt;

    if (salt && capturedPassword) {
        const key = await deriveEncryptionKey(capturedPassword, salt);
        setEncryptionKey(key);
    }
} catch (err) {
    // Non-fatal — user continues without encryption (no key = messages sent as plaintext)
    console.warn('Could not derive encryption key:', err);
}
```

---

### Frontend: useChatSessions Hook Changes

**File:** `frontend/src/hooks/useChatSessions.ts`

**1. Extend imports at the top of the file:**

```typescript
import { encryptMessage, decryptMessage } from '@/lib/crypto';
```

**2. Add `encryptionKey` to the destructure from `useAuth`** (line 48):

```typescript
const { token, logout, encryptionKey } = useAuth();
```

**3. Update the `Message` interface** (around line 15):

```typescript
export interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;             // always plaintext (decrypted before storing in state)
    encrypted_content?: string;  // raw ciphertext from server, not displayed
    is_encrypted?: boolean;
    created_at: string;
    cards?: Card[];
}
```

**4. Update `fetchMessages`** — decrypt user messages after fetching:

```typescript
const fetchMessages = async (sessionId: number) => {
    try {
        const data: Message[] = await chat.getMessages(sessionId);

        const decrypted = await Promise.all(
            data.map(async (msg) => {
                if (msg.is_encrypted && msg.encrypted_content && encryptionKey) {
                    const plain = await decryptMessage(encryptionKey, msg.encrypted_content);
                    return { ...msg, content: plain ?? '[could not decrypt]' };
                }
                return msg;
            })
        );

        setMessages(decrypted);
        setCurrentCards([]);
    } catch (error: unknown) {
        // existing error handling unchanged
        if (error instanceof Error && 'response' in error &&
            (error as { response?: { status?: number } }).response?.status === 401) {
            handleUnauthorized();
            return;
        }
        logHookError('useChatSessions', 'fetchMessages', error);
        setError(error instanceof Error ? error.message : 'Failed to load messages');
    }
};
```

**5. Update `sendMessage`** — encrypt the outgoing message and provide conversation context.

Add this block **before** the `fetch(...)` call (before line 165). The block builds the
request body:

```typescript
// Encrypt the message if we have a key
let encryptedContent: string | undefined;
if (encryptionKey) {
    try {
        encryptedContent = await encryptMessage(encryptionKey, content);
    } catch (err) {
        logError('Encryption failed, sending plaintext', err, { hook: 'useChatSessions' });
    }
}

// Build conversation context from currently-decrypted messages in state.
// NOTE: does NOT include the current message — the backend appends it.
const conversationContext = messages.map(msg => ({
    role: msg.role,
    content: msg.content,   // already decrypted (held in state as plaintext)
}));

const requestBody: Record<string, unknown> = { content };
if (encryptedContent) {
    requestBody.encrypted_content    = encryptedContent;
    requestBody.is_encrypted         = true;
    requestBody.conversation_context = conversationContext;
}
```

Then change the `fetch` call's `body` line:

```typescript
// BEFORE:
body: JSON.stringify({ content }),

// AFTER:
body: JSON.stringify(requestBody),
```

**6. Decrypt the returned user_message from the stream.**

Find the SSE handler for `parsedData.type === 'user_message'` (around line 274).
Replace it with:

```typescript
if (parsedData.type === 'user_message' && parsedData.message) {
    let savedMsg = parsedData.message as Message;
    if (savedMsg.is_encrypted && savedMsg.encrypted_content && encryptionKey) {
        const plain = await decryptMessage(encryptionKey, savedMsg.encrypted_content);
        // Restore the plaintext the user just typed so the display is seamless
        savedMsg = { ...savedMsg, content: plain ?? content };
    }
    setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
        return [...filtered, savedMsg];
    });
}
```

Apply the same pattern in the "final buffer" handler (around line 211).

---

### Handling Password Changes

When the user changes their password, the encryption key changes (same salt, new password
→ different derived key). Previous messages encrypted with the old key become unreadable
unless re-encrypted.

**Key insight:** The salt does **not** need to change. A new key is derived automatically
because `PBKDF2(new_password, salt) ≠ PBKDF2(old_password, salt)`.

**Re-encryption flow on password change:**

Backend — add a key-rotation endpoint to `backend/routers/chat.py`:

```python
from pydantic import BaseModel as PydanticBaseModel

class EncryptedContentUpdate(PydanticBaseModel):
    encrypted_content: str

@router.patch("/sessions/{session_id}/messages/{message_id}/encrypted-content")
async def rotate_message_encryption(
    session_id: int,
    message_id: int,
    update: EncryptedContentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-encrypt a message after a password change. Client does old-key decrypt, new-key encrypt."""
    # Verify the session belongs to the current user
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Forbidden")

    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.chat_session_id == session_id,
        Message.role == "user",
        Message.is_encrypted.is_(True),
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Encrypted message not found")

    msg.encrypted_content = update.encrypted_content
    db.commit()
    return {"ok": True}
```

Frontend — in the password-change form's success handler:

```typescript
// After password change succeeds:
// 1. Re-derive the new key (salt is unchanged, new password is different)
const newKey = await deriveEncryptionKey(newPassword, user.encryption_salt!);

// 2. Fetch all sessions
const sessionsRes = await api.get('/chat/sessions/');
for (const session of sessionsRes.data) {
    const msgsRes = await api.get(`/chat/sessions/${session.id}/messages/`);
    for (const msg of msgsRes.data) {
        if (!msg.is_encrypted || !msg.encrypted_content) continue;

        // 3. Decrypt with the old key (still in state until we call setEncryptionKey)
        const plaintext = await decryptMessage(encryptionKey!, msg.encrypted_content);
        if (!plaintext) continue;

        // 4. Re-encrypt with new key
        const newCiphertext = await encryptMessage(newKey, plaintext);

        // 5. PATCH to server
        await api.patch(
            `/chat/sessions/${session.id}/messages/${msg.id}/encrypted-content`,
            { encrypted_content: newCiphertext },
        );
    }
}

// 6. Store the new key
setEncryptionKey(newKey);
```

> **Simple alternative:** If re-encryption is too complex to implement immediately, warn users
> in the password-change UI that changing their password will make previous messages unreadable,
> and accept that trade-off for v1. The endpoint above can be added later.

---

## Feature 3 — AI Usage Monitoring

### Overview

Track every AI request — token counts, model used, whether it triggered a card draw, and
response time. Expose this data in a new admin page with stat cards and a time-series line chart.

**Metrics tracked:**
- Total AI requests (= each assistant message generated by the LLM)
- Prompt tokens and completion tokens per request
- Whether the request used the `draw_cards` tool (card draw vs. plain chat)
- Response time in milliseconds
- Per-user breakdown

---

### Backend: New Model

**File:** `backend/models.py`

Add after the `TurnUsageHistory` class (around line 647):

```python
class AIRequestLog(Base):
    """Tracks each LLM call: model, token usage, and response time.

    Written inside the streaming response generator after the assistant message
    is committed to the database.
    """

    __tablename__ = "ai_request_logs"

    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id          = Column(Integer, ForeignKey("chat_sessions.id"), nullable=True, index=True)
    assistant_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    model_name          = Column(String, nullable=False, index=True)
    prompt_tokens       = Column(Integer, default=0, nullable=False)
    completion_tokens   = Column(Integer, default=0, nullable=False)
    total_tokens        = Column(Integer, default=0, nullable=False)
    used_tool_call      = Column(Boolean, default=False, nullable=False)  # True = draw_cards was called
    response_time_ms    = Column(Integer, nullable=True)
    requested_at        = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User")
```

---

### Backend: Add `tiktoken` Dependency

`tiktoken` is not in `backend/pyproject.toml`. Add it using `uv`:

```bash
cd backend
uv add tiktoken
```

Or manually add `"tiktoken>=0.7.0"` to the `dependencies` list in `backend/pyproject.toml`,
then run `uv sync`.

---

### Backend: Token Counter Utility

**Create new file:** `backend/utils/token_counter.py`

```python
"""
Approximate token counting via tiktoken.

GPT-4.1-mini uses the cl100k_base encoding (same family as GPT-4/GPT-3.5-turbo).
tiktoken.encoding_for_model() may not know newer model names; the fallback to
cl100k_base is safe and accurate for all current GPT-4 variants.
"""

import logging

logger = logging.getLogger(__name__)


def count_tokens(text: str, model: str = "gpt-4.1-mini") -> int:
    """Count tokens in text using tiktoken. Falls back to a word-count estimate."""
    try:
        import tiktoken
        try:
            enc = tiktoken.encoding_for_model(model)
        except KeyError:
            enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception as e:
        logger.warning(f"tiktoken failed ({e}), using word-count approximation")
        return max(1, len(text.split()))


def count_messages_tokens(messages: list[dict], model: str = "gpt-4.1-mini") -> int:
    """Count tokens across a messages list (each item has 'role' and 'content')."""
    total = 0
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, str):
            total += count_tokens(content, model)
        total += 4  # per-message overhead (role, separators)
    total += 2  # reply primer
    return total
```

---

### Backend: Alembic Migration for AIRequestLog

```bash
alembic revision --autogenerate -m "add_ai_request_logs"
```

The `upgrade()` should create the `ai_request_logs` table. Verify it looks like:

```python
def upgrade() -> None:
    op.create_table(
        'ai_request_logs',
        sa.Column('id',                   sa.Integer(), primary_key=True),
        sa.Column('user_id',              sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('session_id',           sa.Integer(), sa.ForeignKey('chat_sessions.id'), nullable=True),
        sa.Column('assistant_message_id', sa.Integer(), sa.ForeignKey('messages.id'), nullable=True),
        sa.Column('model_name',           sa.String(),  nullable=False),
        sa.Column('prompt_tokens',        sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens',    sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens',         sa.Integer(), nullable=False, server_default='0'),
        sa.Column('used_tool_call',       sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('response_time_ms',     sa.Integer(), nullable=True),
        sa.Column('requested_at',         sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_ai_request_logs_user_id',      'ai_request_logs', ['user_id'])
    op.create_index('ix_ai_request_logs_requested_at', 'ai_request_logs', ['requested_at'])
```

Apply: `python migrate.py`

---

### Backend: New Schemas

**File:** `backend/schemas.py`

Add after the subscription dashboard schemas:

```python
# ---- AI Monitoring Schemas ----

class AIStatsResponse(BaseModel):
    total_requests: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    avg_tokens_per_request: float
    tool_call_rate: float       # 0.0–1.0; percentage of requests that drew cards
    requests_today: int
    tokens_today: int


class AIDataPoint(BaseModel):
    date: str
    requests: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class AITopUser(BaseModel):
    user_id: int
    username: str
    total_requests: int
    total_tokens: int
```

---

### Backend: Chat Router Changes for Logging

**File:** `backend/routers/chat.py`

**Step 1 — Import the new model and utility** at the top of the file:

```python
import time                                           # new
from models import AIRequestLog                       # new
from utils.token_counter import count_messages_tokens, count_tokens  # new
```

**Step 2 — Start the timer** at the very beginning of `generate_streaming_response` (inside the
`try:` block, before the first `yield`):

```python
async def generate_streaming_response():
    try:
        request_start = time.monotonic()    # ADD THIS LINE — measure full response time
        # ... rest of the existing code ...
```

**Step 3 — Write the log after the tool-call path commits the assistant message.**

Find the `db.commit()` after the tool path (around line 985, where `ai_message` is committed
in the tool call branch). Add immediately after:

```python
# --- AI request logging (tool-call path) ---
try:
    elapsed_ms     = int((time.monotonic() - request_start) * 1000)
    prompt_tok     = count_messages_tokens(messages_for_llm, settings.OPENAI_MODEL)
    completion_tok = count_tokens(complete_ai_content, settings.OPENAI_MODEL)
    db.add(AIRequestLog(
        user_id              = current_user.id,
        session_id           = session_id,
        assistant_message_id = ai_message.id,
        model_name           = settings.OPENAI_MODEL,
        prompt_tokens        = prompt_tok,
        completion_tokens    = completion_tok,
        total_tokens         = prompt_tok + completion_tok,
        used_tool_call       = True,
        response_time_ms     = elapsed_ms,
    ))
    db.commit()
except Exception as _log_err:
    db.rollback()
    logger.logger.warning(f"AI log write failed (non-fatal): {_log_err}")
# ---
```

**Step 4 — Write the log after the no-tool path commits the assistant message.**

Find the `db.commit()` in the no-tool branch (around line 1070). Add immediately after:

```python
# --- AI request logging (no-tool path) ---
try:
    elapsed_ms     = int((time.monotonic() - request_start) * 1000)
    prompt_tok     = count_messages_tokens(messages_for_llm, settings.OPENAI_MODEL)
    completion_tok = count_tokens(response_content, settings.OPENAI_MODEL)
    db.add(AIRequestLog(
        user_id              = current_user.id,
        session_id           = session_id,
        assistant_message_id = ai_message.id,
        model_name           = settings.OPENAI_MODEL,
        prompt_tokens        = prompt_tok,
        completion_tokens    = completion_tok,
        total_tokens         = prompt_tok + completion_tok,
        used_tool_call       = False,
        response_time_ms     = elapsed_ms,
    ))
    db.commit()
except Exception as _log_err:
    db.rollback()
    logger.logger.warning(f"AI log write failed (non-fatal): {_log_err}")
# ---
```

> Logging failures are **non-fatal** — the user's message is already saved, so we catch and
> warn rather than letting the exception bubble up and break the stream.

---

### Backend: New Admin Endpoints

**File:** `backend/routers/admin.py`

Add these imports (merge with existing):

```python
from models import AIRequestLog
from schemas import AIStatsResponse, AIDataPoint, AITopUser
```

Add the three endpoints after the subscription endpoints:

---

#### AI Stats

```python
@router.get("/ai/stats", response_model=AIStatsResponse)
async def get_ai_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """Aggregate AI usage statistics across all users."""
    logs = db.query(AIRequestLog).all()

    if not logs:
        return AIStatsResponse(
            total_requests=0, total_prompt_tokens=0, total_completion_tokens=0,
            total_tokens=0, avg_tokens_per_request=0.0, tool_call_rate=0.0,
            requests_today=0, tokens_today=0,
        )

    total_requests       = len(logs)
    total_prompt         = sum(l.prompt_tokens for l in logs)
    total_completion     = sum(l.completion_tokens for l in logs)
    total_tokens         = sum(l.total_tokens for l in logs)
    tool_calls           = sum(1 for l in logs if l.used_tool_call)
    avg_tokens           = round(total_tokens / total_requests, 1)
    tool_call_rate       = round(tool_calls / total_requests, 4)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs  = [l for l in logs if l.requested_at.replace(tzinfo=None) >= today_start]
    requests_today = len(today_logs)
    tokens_today   = sum(l.total_tokens for l in today_logs)

    return AIStatsResponse(
        total_requests=total_requests,
        total_prompt_tokens=total_prompt,
        total_completion_tokens=total_completion,
        total_tokens=total_tokens,
        avg_tokens_per_request=avg_tokens,
        tool_call_rate=tool_call_rate,
        requests_today=requests_today,
        tokens_today=tokens_today,
    )
```

---

#### AI Activity Over Time

```python
@router.get("/ai/activity-over-time", response_model=list[AIDataPoint])
async def get_ai_activity_over_time(
    days: int = 30,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 1 and 365")

    cutoff = datetime.utcnow() - timedelta(days=days)
    logs = (
        db.query(AIRequestLog)
        .filter(AIRequestLog.requested_at >= cutoff)
        .order_by(AIRequestLog.requested_at.asc())
        .all()
    )

    data: dict[str, dict] = {}
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).date()
        data[str(d)] = {"requests": 0, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    for l in logs:
        key = str(l.requested_at.date())
        if key in data:
            data[key]["requests"]          += 1
            data[key]["prompt_tokens"]     += l.prompt_tokens
            data[key]["completion_tokens"] += l.completion_tokens
            data[key]["total_tokens"]      += l.total_tokens

    return [
        AIDataPoint(
            date=date_str,
            requests=v["requests"],
            prompt_tokens=v["prompt_tokens"],
            completion_tokens=v["completion_tokens"],
            total_tokens=v["total_tokens"],
        )
        for date_str, v in data.items()
    ]
```

---

#### AI Top Users

```python
@router.get("/ai/top-users", response_model=list[AITopUser])
async def get_ai_top_users(
    limit: int = 10,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    rows = (
        db.query(
            AIRequestLog.user_id,
            User.username,
            func.count(AIRequestLog.id).label("total_requests"),
            func.sum(AIRequestLog.total_tokens).label("total_tokens"),
        )
        .join(User, AIRequestLog.user_id == User.id)
        .group_by(AIRequestLog.user_id, User.username)
        .order_by(func.sum(AIRequestLog.total_tokens).desc())
        .limit(limit)
        .all()
    )

    return [
        AITopUser(
            user_id=row.user_id,
            username=row.username,
            total_requests=row.total_requests,
            total_tokens=row.total_tokens or 0,
        )
        for row in rows
    ]
```

---

### Frontend: Add Navigation Link

**File:** `frontend/src/app/admin/page.tsx`

Import `Activity` from lucide-react and add to `menuItems`:

```tsx
import { ..., Activity } from 'lucide-react';

{ href: '/admin/ai-monitoring', label: 'AI Monitoring', icon: Activity },
```

---

### Frontend: AI Monitoring Page

**File to create:** `frontend/src/app/admin/ai-monitoring/page.tsx`

This page uses two Y axes on the line chart (requests on left, tokens on right). Recharts
requires `yAxisId` on each `<Line>` and a matching `yAxisId` on each `<YAxis>` when using two axes.

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer,
} from 'recharts';

// ---- Types ----

interface AIStats {
    total_requests: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    avg_tokens_per_request: number;
    tool_call_rate: number;
    requests_today: number;
    tokens_today: number;
}

interface AIDataPoint {
    date: string;
    requests: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

interface AITopUser {
    user_id: number;
    username: string;
    total_requests: number;
    total_tokens: number;
}

// ---- Stat Card ----

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="bg-gray-800 border border-purple-700/50 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-purple-400 mt-1">{sub}</p>}
        </div>
    );
}

// ---- Main Page ----

export default function AIMonitoringPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats]         = useState<AIStats | null>(null);
    const [activity, setActivity]   = useState<AIDataPoint[]>([]);
    const [topUsers, setTopUsers]   = useState<AITopUser[]>([]);
    const [loading, setLoading]     = useState(true);
    const [chartDays, setChartDays] = useState(30);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated || !user?.is_admin) {
            router.push(isAuthenticated ? '/' : '/login');
        }
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, actRes, topRes] = await Promise.all([
                api.get('/admin/ai/stats'),
                api.get(`/admin/ai/activity-over-time?days=${chartDays}`),
                api.get('/admin/ai/top-users?limit=10'),
            ]);
            setStats(statsRes.data);
            setActivity(actRes.data);
            setTopUsers(topRes.data);
        } catch (err) {
            console.error('Failed to load AI monitoring data', err);
        } finally {
            setLoading(false);
        }
    }, [chartDays]);

    useEffect(() => {
        if (isAuthenticated && user?.is_admin) loadData();
    }, [isAuthenticated, user, loadData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 p-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">AI Usage Monitoring</h1>
                        <p className="text-gray-400 mt-1">Requests, token consumption, and model performance</p>
                    </div>
                    <button onClick={() => router.push('/admin')}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                        ← Back to Admin
                    </button>
                </div>

                {/* Stat Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            label="Total AI Requests"
                            value={stats.total_requests.toLocaleString()}
                            sub={`${stats.requests_today} today`} />
                        <StatCard
                            label="Total Tokens Used"
                            value={stats.total_tokens.toLocaleString()}
                            sub={`${stats.tokens_today.toLocaleString()} today`} />
                        <StatCard
                            label="Avg Tokens / Request"
                            value={stats.avg_tokens_per_request.toLocaleString()} />
                        <StatCard
                            label="Card Draw Rate"
                            value={`${(stats.tool_call_rate * 100).toFixed(1)}%`}
                            sub="requests that drew cards" />
                    </div>
                )}

                {/* Token Breakdown Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <StatCard label="Prompt Tokens (total)"
                            value={stats.total_prompt_tokens.toLocaleString()} />
                        <StatCard label="Completion Tokens (total)"
                            value={stats.total_completion_tokens.toLocaleString()} />
                        <StatCard label="Prompt / Completion Ratio"
                            value={stats.total_completion_tokens > 0
                                ? `${(stats.total_prompt_tokens / stats.total_completion_tokens).toFixed(1)}:1`
                                : '—'} />
                    </div>
                )}

                {/* Activity Line Chart */}
                <div className="bg-gray-800 border border-purple-700/50 rounded-xl p-5 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Daily Activity — Requests &amp; Tokens
                        </h2>
                        <select value={chartDays} onChange={e => setChartDays(Number(e.target.value))}
                            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>

                    {/*
                      Two Y axes:
                        yAxisId="requests" (left)  — for daily request counts (small numbers)
                        yAxisId="tokens"   (right) — for daily token totals  (large numbers)
                      Each <Line> must declare which axis it uses via yAxisId.
                    */}
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }}
                                tickFormatter={d => d.slice(5)} />
                            <YAxis yAxisId="requests" orientation="left"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                label={{ value: 'Requests', angle: -90, position: 'insideLeft',
                                    fill: '#9ca3af', fontSize: 11, dy: 40 }} />
                            <YAxis yAxisId="tokens" orientation="right"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                label={{ value: 'Tokens', angle: 90, position: 'insideRight',
                                    fill: '#9ca3af', fontSize: 11, dy: -30 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #6b21a8' }}
                                labelStyle={{ color: '#e5e7eb' }} />
                            <Legend />
                            <Line yAxisId="requests" type="monotone" dataKey="requests"
                                stroke="#a855f7" strokeWidth={2} dot={false} name="Requests" />
                            <Line yAxisId="tokens" type="monotone" dataKey="total_tokens"
                                stroke="#22d3ee" strokeWidth={2} dot={false} name="Total Tokens" />
                            <Line yAxisId="tokens" type="monotone" dataKey="prompt_tokens"
                                stroke="#fbbf24" strokeWidth={1} dot={false} name="Prompt Tokens"
                                strokeDasharray="4 2" />
                            <Line yAxisId="tokens" type="monotone" dataKey="completion_tokens"
                                stroke="#4ade80" strokeWidth={1} dot={false} name="Completion Tokens"
                                strokeDasharray="4 2" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Users Table */}
                <div className="bg-gray-800 border border-purple-700/50 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-gray-700">
                        <h2 className="text-lg font-semibold text-white">Top Users by Token Usage</h2>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-700/50">
                            <tr>
                                {['Rank', 'User ID', 'Username', 'Requests', 'Total Tokens'].map(h => (
                                    <th key={h} className="px-4 py-3 text-gray-400 font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {topUsers.map((u, i) => (
                                <tr key={u.user_id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                                    <td className="px-4 py-3 text-gray-400">#{i + 1}</td>
                                    <td className="px-4 py-3 text-gray-400">{u.user_id}</td>
                                    <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                                    <td className="px-4 py-3 text-purple-400">
                                        {u.total_requests.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-cyan-400">
                                        {u.total_tokens.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {topUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No AI requests logged yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
```

---

## Testing Checklist

### Feature 1: Admin Subscription Dashboard

- [ ] `GET /admin/subscriptions/stats` — verify `total_revenue_usd` matches hand-computed sum from `payment_transactions`
- [ ] `GET /admin/subscriptions/revenue-over-time?days=7` — returns exactly 7 entries; zero-revenue days are present (no gaps)
- [ ] `GET /admin/subscriptions/transactions?limit=5&offset=5` — returns the second page; try with `offset=0` and `limit=100` to see full list
- [ ] `PATCH /admin/users/{id}/subscription` with `{"add_paid_turns": 5}` — verify `number_of_paid_turns` incremented
- [ ] `PATCH /admin/users/{id}/subscription` with `{"subscription_status": "active"}` — persists in DB
- [ ] Non-admin user gets HTTP 403 on all `/admin/*` endpoints
- [ ] Frontend: stat cards match the API response values
- [ ] Frontend: changing the "Last N days" selector re-fetches and re-renders the line chart
- [ ] Frontend: subscription editor shows green success text on update, red on error

### Feature 2: Message Encryption

- [ ] Migration ran cleanly; `users` table has `encryption_salt`; `messages` table has `encrypted_content` and `is_encrypted`
- [ ] Existing users received a non-null `encryption_salt` from the migration loop
- [ ] Newly registered user has a non-null `encryption_salt`
- [ ] `GET /auth/me` response includes `encryption_salt` field (not null for new users)
- [ ] After login, `useAuth().encryptionKey` is non-null
- [ ] Sending a message while logged in: `messages` table row has `content = '[encrypted]'` and `encrypted_content` is non-null base64 string
- [ ] Loading that session: the message displays correctly (decrypted to original text)
- [ ] The AI response references earlier context correctly (conversation_context path works)
- [ ] Logging out clears the key; re-login re-derives it; existing encrypted messages still display
- [ ] A message sent when `encryptionKey` is null (old user without salt) is stored as plaintext and displays normally

### Feature 3: AI Usage Monitoring

- [ ] After sending a few messages, `ai_request_logs` table has rows with non-zero token counts
- [ ] Tool-call requests (card draws) have `used_tool_call = true`
- [ ] Plain chat responses have `used_tool_call = false`
- [ ] `GET /admin/ai/stats` — `total_requests` matches `SELECT COUNT(*) FROM ai_request_logs`
- [ ] `GET /admin/ai/activity-over-time?days=7` — returns 7 entries; today's entry has `requests > 0` if requests were made today
- [ ] `GET /admin/ai/top-users` — the user who sent the most messages appears first
- [ ] A logging failure (simulate by temporarily breaking the DB write) does NOT cause the streaming response to fail — user still gets their AI response
- [ ] Frontend: stat cards update on page load; `requests_today` increments after sending a message and refreshing
- [ ] Frontend: dual-Y-axis line chart renders without console errors; both axes have readable tick labels
- [ ] Frontend: top users table shows correct username and token counts
