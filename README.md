# HIA NEXUS — AI Healthcare Insurance Assistant

> Masters Research Project | React + Vite + Tailwind + Supabase + Claude AI + XGBoost

---

## Quick Start (5 minutes)

### 1. Create your .env file
```bash
cp .env.example .env
```
Open `.env` and fill in your actual keys:
```
VITE_SUPABASE_URL=https://ltgaujddhonsoitdboet.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_publishable_key
VITE_ANTHROPIC_API_KEY=your_new_anthropic_key
SUPABASE_SERVICE_ROLE_KEY=your_new_secret_key
```

### 2. Install dependencies & run
```bash
npm install
npm run dev
```
Open http://localhost:5173

### 3. Train the ML model (optional)
```bash
pip install xgboost scikit-learn pandas numpy joblib
python ml/train_model.py
```

---

## What's Built

### Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with features, how-it-works, CTA |
| `/auth` | Login + Register + Google OAuth |
| `/dashboard` | User dashboard with stats and quick actions |
| `/upload` | Upload medical docs → AI extracts data → follow-up questions |
| `/recommendations` | Ranked insurance plan recommendations with AI reasoning |
| `/vault` | PIN + OTP protected medical document vault |
| `/chat` | Full AI chatbot powered by Claude |

### AI/ML Features
- **Document Extraction**: Claude reads PDF/image medical docs and extracts structured health data
- **Follow-up Questions**: Claude generates 8-10 personalized insurance-standard questions
- **XGBoost Recommender**: Trained on 5,000 synthetic MEPS-inspired patient records
- **Claude Reasoning**: Explains why each plan was recommended for your specific profile
- **Chatbot**: Full knowledge of all 8 insurance plans, coverage details, premiums, ACA rules

### Insurance Plans
1. NexusCare Basic (Bronze) — $180/mo
2. NexusCare Plus (Silver PPO) — $320/mo ⭐ Most Popular
3. NexusCare Premium (Gold PPO) — $520/mo
4. NexusCare Elite (Platinum) — $720/mo
5. NexusFamily Shield (Silver Family) — $680/mo
6. NexusFamily Complete (Gold Family) — $1,100/mo
7. NexusChronic Care (Gold, chronic conditions) — $480/mo
8. NexusHSA Saver (HDHP/HSA eligible) — $240/mo

### Tech Stack
- **Frontend**: React 18, Vite 5, Tailwind CSS 3
- **Database**: Supabase (PostgreSQL + RLS + Storage)
- **AI**: Anthropic Claude Sonnet (claude-sonnet-4-20250514)
- **ML**: XGBoost classifier (scikit-learn pipeline)
- **Auth**: Supabase Auth (email + Google OAuth)
- **UI**: Lucide icons, Framer Motion, React Hot Toast

---

## Supabase Setup (already done if you ran the SQL)

Tables created:
- `profiles` — user profiles
- `medical_documents` — uploaded document metadata + extracted data
- `recommendations` — ML scores + Claude reasoning
- `chat_messages` — full chat history
- `health_questionnaire` — user answers to follow-up questions

All tables have Row Level Security enabled.

---

## Project Structure
```
hia-nexus/
├── src/
│   ├── pages/          # All page components
│   ├── components/     # Reusable UI components
│   │   └── layout/     # Navbar
│   ├── hooks/          # useAuth hook + AuthContext
│   ├── services/       # Claude API calls
│   ├── data/           # Insurance plans data + ML scoring
│   └── lib/            # Supabase client
├── ml/
│   └── train_model.py  # XGBoost training script
├── .env.example        # Environment variables template
└── README.md
```
