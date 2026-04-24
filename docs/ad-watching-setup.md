# Ad-Watching Turn System — Setup Guide

## 1. Sign Up for Adsterra

1. Go to **adsterra.com** and create a **Publisher** account
2. Add your website (`arcanaai.nguyenvanloc.com`) as a new site
3. Wait for site approval (usually within 24 hours)
4. Once approved, create a new ad zone:
   - **Format**: **Banner** (required for inline display — Direct Link / Smartlink URLs
     are blocked from iframe embedding by `X-Frame-Options`)
   - **Size**: 300×250
   - **Category**: Entertainment / Lifestyle
   - Copy the **invoke.js URL** — you will need it in step 2

---

## 2. Configure Environment Variables

Add this to your frontend `.env` (or `.env.production`):

```env
NEXT_PUBLIC_ADSTERRA_BANNER_INVOKE_URL=
```

To find your invoke.js URL:
1. Open your Adsterra dashboard
2. Expand your site → click **Get Code** next to the Banner zone
3. You'll see two `<script>` tags. Copy the `src` of the second one — it looks like
   `https://www.highperformanceformat.com/<KEY>/invoke.js` (host may vary).
   The component extracts the zone key from the URL path automatically, so no
   other value needs to be copied.

> Without this, the 15-second countdown still works but no real ad is shown. That is useful for local testing.

---

## 3. Run the Database Migration

SSH into your server and run:

```bash
cd /path/to/arcana-ai/backend
alembic upgrade head
```

This creates the `ad_views` table and adds `ad_turns_earned_today` / `ad_turns_reset_date` columns to the `users` table.

---

## 4. Deploy the Updated Code

```bash
# Pull the latest branch
git pull origin claude/research-ad-plans-VNlrM

# Rebuild and restart containers
docker compose down
docker compose up -d --build
```

---

## 5. Test the Full Flow

1. Log in to your app
2. Click **Get Turns** in the turn counter (or open the modal)
3. Click **Watch Ad (+1 turn)**
4. The ad modal opens — wait 15 seconds
5. Click **Claim Turn**
6. Your turn count should increase by 1
7. Repeat up to 20 times — on the 21st attempt the button should be disabled with "Ad limit reached today"

---

## 6. Verify in the Database (Optional)

```sql
-- Check a user's ad turns today
SELECT id, username, ad_turns_earned_today, ad_turns_reset_date
FROM users WHERE username = 'your_test_user';

-- Check ad view history
SELECT * FROM ad_views ORDER BY viewed_at DESC LIMIT 10;
```

---

## Summary of Limits

| Rule | Value |
|---|---|
| Max ad turns per day | 20 |
| Turns per ad watched | 1 |
| Do ad-earned turns expire? | No |
| Daily counter resets | Midnight (server date) |
