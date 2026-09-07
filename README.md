# 🩺 Clinic Natin — Medical Queue Management & EMR Platform

> **Skip the Waiting Room. Track Your Turn from Anywhere.**  
> *Ending the 7:00 AM manual hospital clipboard queue in Cagayan de Oro by seamlessly bridging patients, doctors, and clinic secretaries.*

---

## 🌟 Overview

**Clinic Natin** is a modern outpatient queue management and clinical coordination platform designed for medical clinics, private practices, and hospital medical arts centers in the Philippines.

Historically, patients across Northern Mindanao wake up before dawn to stand in long physical lines outside hospital buildings (such as *Maria Reyna Xavier University Hospital*, *Capitol University Medical Center*, *Polymedic Plaza*, and *Northern Mindanao Medical Center*) just to receive a handwritten paper number on a clipboard. 

**Clinic Natin** transforms this experience into a synchronized, fair digital workflow:
- **Patients** reserve official queue tokens online (₱50 convenience fee via GCash/Maya QRPH), track live turns from home or a cafe, and receive advance SMS notifications.
- **Secretaries** manage queues with one-click calling, 1-tap emergency delay broadcasts, fair interleaved walk-in ticketing, and a 45-minute Buffer Lane grace period for late arrivals.
- **Doctors** access a modern consultation suite with pre-recorded vitals, digital prescription pads (℞), and optional Pro Practice Suite upgrades (multi-hospital room scheduling & longitudinal EMR).

---

## 💼 Grounded Real-World Business Model

Operated by **CodeNinjas Web Development Services**, Clinic Natin runs on a sustainable **Dual-Engine Monetization Model**:

### 1. Engine 1: B2C Patient Convenience Fees (₱50.00 / Reservation)
- Patients pay a flat **₱50.00 convenience fee** via **PayMongo QRPH** (interoperable across GCash, Maya, ShopeePay, and Philippine bank apps) to skip the 7:00 AM physical lineup.
- Walk-ins registered at the clinic front desk remain **100% free**.

### 2. Engine 2: B2B Doctor SaaS Tiers (Free vs. Pro ₱999.00 / month)
- **Free Tier (Worth-It Starter)**: Genuinely usable forever with unlimited patient volume, live consultation cockpit, real-time triage vitals, drug allergy safety alerts, and standard digital Rx pad. (Doctors bring patient volume that generates ₱50 booking fees).
- **Pro Tier (₱999 / month or ₱9,990 / year — Less than 2 consultations)**:
  - **Unlimited Hospital Clinic Rooms & Schedules** (e.g. Maria Reyna Room 304, Polymedic Plaza Room 210, CUMC Medical Arts).
  - **Multiple Secretary Logins** linked per hospital room.
  - **Full Longitudinal Patient EMR History** (past encounters, blood pressure progression charts, previous prescriptions).
  - **Unlimited Lab & Imaging Chart Attachments** (PDF / JPG).
  - **1-Tap Surgery Delay SMS Broadcasts** via Semaphore.
  - **"Verified Specialist" Badge** with top priority placement in directory search.

---

## 🚀 Key Features & Operations

### 1. 🔀 Interleaved Fair Queueing Engine
- **Fair Hallway Alternation**: To prevent hallway resentment between early walk-in patients and online bookers:
  - **Online Reservations** strictly receive **ODD numbers** (`1, 3, 5, 7...`) with token code prefix `CN-ON...`.
  - **Front-Desk Walk-Ins** strictly receive **EVEN numbers** (`2, 4, 6, 8...`) with token code prefix `CN-WK...`.
- The queue engine serves the natural ascending order (`#1`, `#2`, `#3`, `#4`), skipping unbooked or absent slots dynamically without stalling the clinic.

### 2. ⏳ Buffer Lane & 45-Minute Arrival Grace Period
- If a patient is called while stuck in CDO traffic or away in the hospital cafeteria, they are **not forfeited immediately**.
- The secretary places them into the **Buffer Lane (Grace Period)** with a 45-minute countdown.
- When the patient arrives at the desk, the secretary clicks **"Check In (+2 Slots)"** which automatically slots them into the active queue **2 consultations ahead** and sends an automated SMS.

### 3. 📢 1-Tap Doctor Delay & Queue Broadcast (Semaphore SMS)
- Both Secretary Desk and Doctor Suite feature 1-tap delay broadcast presets:
  - `⏱️ +15m Rounds` &bull; `🚨 +30m Surgery` &bull; `🚗 +45m Traffic` &bull; `Custom Announcement`
- Instantly updates patient mobile tracker screens in real time and broadcasts transactional SMS alerts via the **Semaphore SMS Gateway**.

### 4. 💳 PayMongo QRPH Payment Service
- Generates dynamic, interoperable **QRPH codes** compliant with Bangko Sentral ng Pilipinas (BSP) standards.
- Webhook listener (`/api/webhooks/paymongo`) automatically verifies payments, marks transactions as `SUCCESS`, updates appointment status to `PAID`, and triggers SMS booking confirmations.

### 5. 🪪 Patient Health Passport & Onboarding Stepper (`/onboarding`)
- **Vitals & Demographics**: Birthday (auto-age), blood type, height (ft/in vs cm toggle), weight, and live BMI status.
- **Triage & Safety**: Quick-tap drug allergy badges (*Penicillin, Aspirin, Amoxicillin, Sulfa Drugs*), chronic comorbidities, and maintenance medications.
- **Philippine Priority Lanes**: RA 9994 Senior Citizens (OSCA ID), RA 7277 PWDs, and maternal priority validation.
- **Digital Clinic Pass**: Generates a scannable digital QR pass for 1-second front-desk check-in.

### 6. 👩‍💼 Secretary Live Queue Controller (`/secretary/dashboard`)
- 4-Column Operations Kanban:
  1. **Active Lineup**: Alternating Online (Odd) & Walk-In (Even) queue cards.
  2. **Buffer Lane**: 45-min arrival grace countdown with 1-click restore (+2 slots) and forfeit.
  3. **Currently Serving**: In-consultation status card with 1-click "Complete & Call Next".
  4. **Completed Today**: Session history with cash count tracking.

### 7. 👨‍⚕️ Doctor Consultation Suite (`/doctor/dashboard`)
- Attending physician workspace:
  - Active consultation view with chief complaints, pre-populated vitals, and digital Rx pad.
  - **Multi-Clinic Room Switcher**: Instant schedule switching between Maria Reyna, Polymedic, and CUMC.
  - **Longitudinal Medical History (Pro Tier)**: Review past visit dates, diagnosis timeline, and uploaded lab results.
  - **Subscription Tier Toggle**: Built-in switcher to demonstrate Free vs. Pro tiers.

---

## 🎨 Design System & Brand Palette

Built with **shadcn/ui** primitives and custom CSS variables tuned to Clinic Natin's clinical green brand:

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| **`brand-50`** | `#F1FFFA` | Ultra-light mint (Page backgrounds & soft container fills) |
| **`brand-100`** | `#CCFCCB` | Light green (Soft highlights, badges, secondary pills) |
| **`brand-300`** | `#96E6B3` | Seafoam (Accents, active borders, subtle glows) |
| **`brand-700`** | `#568259` | Forest green (Primary buttons, typography, brand accents) |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **UI & Components**: [React 19](https://react.dev/) & [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `class-variance-authority` (cva) & `tailwind-merge`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Realtime WebSockets)
- **Payment Processing**: [PayMongo API](https://paymongo.com/) (QRPH, GCash, Maya)
- **SMS Gateway**: [Semaphore API](https://semaphore.co/) (Transactional Philippine SMS)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 📂 Project Structure

```text
clinic-natin/
├── src/
│   ├── app/
│   │   ├── (patient)/
│   │   │   ├── discover/              # Patient clinic and doctor search
│   │   │   └── my-queue/              # Live Patient Turn Tracker & digital token
│   │   ├── api/
│   │   │   ├── payments/paymongo/     # PayMongo QRPH payment intent creator
│   │   │   ├── queue/delay-broadcast/ # 1-Tap Semaphore SMS delay dispatcher
│   │   │   ├── queue/restore-buffered/# Buffer Lane Grace Period restoration
│   │   │   └── webhooks/paymongo/     # PayMongo webhook signature & payment handler
│   │   ├── dashboard/                 # Smart role-based gateway redirector
│   │   ├── doctor/
│   │   │   └── dashboard/             # Doctor Suite (Consultation, Multi-room & EMR)
│   │   ├── login/                     # Portal Sign In with 1-Click Demo Personas
│   │   ├── onboarding/                # Patient Health Passport Stepper & QR Pass
│   │   ├── secretary/
│   │   │   └── dashboard/             # Secretary Desk, Buffer Lane & Interleaved Lineup
│   │   ├── signup/                    # Patient self-registration page
│   │   ├── globals.css                # Semantic color tokens & Tailwind utilities
│   │   ├── layout.tsx                 # Root metadata, fonts, and layout
│   │   └── page.tsx                   # Interactive landing page with FAQ & directory
│   ├── components/
│   │   └── ui/                        # Complete shadcn/ui component suite
│   ├── lib/
│   │   ├── payments/                  # PayMongo QRPH payment service
│   │   ├── sms/                       # Semaphore SMS gateway integration
│   │   ├── supabase/                  # Supabase SSR & browser clients
│   │   └── utils.ts                   # cn() styling helper (clsx + tailwind-merge)
│   └── proxy.ts                       # Next.js 16 role-based authentication proxy
├── supabase/
│   ├── schema.sql                     # Production PostgreSQL schema, DDL & triggers
│   └── migrations/                    # Incremental database migrations
├── public/                            # Static media and favicons
├── package.json                       # Dependencies & build scripts
└── README.md                          # Platform documentation
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** or **pnpm**

### 1. Clone & Install
```bash
git clone https://github.com/codeninjasph/clinic-natin.git
cd clinic-natin
npm install
```

### 2. Configure Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Payment Gateway (PayMongo)
PAYMONGO_SECRET_KEY=sk_live_or_test_key
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret

# SMS Gateway (Semaphore)
SEMAPHORE_API_KEY=your_semaphore_api_key
SEMAPHORE_SENDER_NAME=CLINICNATIN
```
*(Note: If `PAYMONGO_SECRET_KEY` or `SEMAPHORE_API_KEY` are left blank, the app gracefully operates in zero-crash mock mode for local testing).*

### 3. Run Database Migrations
Execute `supabase/schema.sql` or `supabase/migrations/20260907_business_model_enhancements.sql` in your Supabase SQL Editor.

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):
- **Secretary Desk**: `http://localhost:3000/secretary/dashboard`
- **Doctor Suite**: `http://localhost:3000/doctor/dashboard`
- **Patient Queue Tracker**: `http://localhost:3000/my-queue`
- **Doctor Directory**: `http://localhost:3000/discover`
- **Health Passport Onboarding**: `http://localhost:3000/onboarding`

---

## 🏥 CDO Pilot Hospital Clusters
- **Maria Reyna Xavier University Hospital** (Hayes St, CDO)
- **Capitol University Medical Center (CUMC)** (Gusa Highway, CDO)
- **Cagayan de Oro Polymedic Plaza** (Kauswagan Highway, CDO)
- **Northern Mindanao Medical Center (NMMC)** (Capitol Compound, CDO)

---

## ⚖️ Compliance & Data Privacy
- **Republic Act No. 10173** (Philippine Data Privacy Act of 2012)
- **Republic Act No. 9994** (Expanded Senior Citizens Act — 20% statutory discount & express queueing)
- **Republic Act No. 7277** (Magna Carta for Persons with Disability)
- Strict Row-Level Security (RLS) isolating patient longitudinal charts to linked physicians, with restricted secretary triage access limited to active sessions.

---

## 🏢 Operator & Credits

Operated and developed by **[CodeNinjas Web Development Services](https://github.com/codeninjasph)**.  
For partnerships, doctor onboarding, or clinic inquiries: `contact@clinicnatin.ph`.

&copy; 2026 **Clinic Natin**. All rights reserved.
