# 🩺 Clinic Natin — Medical Queue Management SaaS

> **Skip the Waiting Room. Track Your Turn from Anywhere.**  
> *Ending the 7:00 AM manual hospital queuing problem in Cagayan de Oro by seamlessly bridging patients and doctors.*

---

## 🌟 Overview

**Clinic Natin** is a modern healthcare queue management platform designed for outpatient clinics, medical arts centers, and hospital practices in the Philippines. 

Traditionally, patients in Northern Mindanao wake up before dawn and stand in physical queues outside hospital buildings (e.g., Maria Reyna XU Hospital, Capitol University Medical Center, Polymedic Plaza, NMMC) just to secure handwritten paper numbers. **Clinic Natin** replaces this manual chaos with a synchronized digital queue system, real-time status updates, and automated notifications.

---

## 🚀 Key Features

### 1. 🔍 Interactive Doctor & Clinic Directory
- Search verified specialists across Cagayan de Oro by name, specialty, clinic location, or schedule.
- Instant filter toggles for **HMO Accreditation** (Maxicare, Intellicare, Medicard, PhilHealth) and **Active Live Queues**.

### 2. 🎟️ Digital Slot Reservation
- Patients secure an official queue token without physical presence.
- Flat ₱40 cashless convenience fee settled via GCash, Maya, or Card.
- Doctor consultation fees are paid directly at the clinic or billed to HMOs as usual.

### 3. 📡 Real-Time Live Queue Monitoring
- Track the current serving number (`#Now Serving`) and queue progression from home or a nearby café.
- Advance arrival countdowns and SMS notification alerts when your number is 2 slots away.

### 4. 👩‍⚕️ Clinic Secretary Management Dashboard
- Live queue controller for clinic secretaries and medical assistants.
- One-click actions: Call Next Patient, Mark Serving, Complete Consultation, and Skip/Re-queue.
- Priority queueing lanes for **Seniors**, **PWDs**, and **Pregnant Patients**.
- Walk-in patient registration alongside online bookings.

---

## 🎨 Design System & Brand Palette

Clinic Natin follows a clean, modern, and trustworthy aesthetic with custom brand color tokens:

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| **`brand-50`** | `#F1FFFA` | Ultra-light mint (Page backgrounds & soft container fills) |
| **`brand-100`** | `#CCFCCB` | Light green (Soft highlights, badges, secondary pills) |
| **`brand-300`** | `#96E6B3` | Seafoam (Accents, active borders, subtle glows) |
| **`brand-700`** | `#568259` | Forest green (Primary buttons, typography, key brand accents) |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Realtime**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime Subscriptions)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 📂 Project Structure

```text
clinic-natin/
├── src/
│   ├── app/
│   │   ├── (patient)/
│   │   │   └── discover/          # Patient doctor discovery & clinic finder
│   │   ├── (secretary)/
│   │   │   └── dashboard/         # Secretary live queue controller
│   │   ├── globals.css            # Tailwind v4 theme & brand tokens
│   │   ├── layout.tsx             # Root layout & SEO metadata
│   │   └── page.tsx               # Modern interactive landing page
│   └── lib/
│       └── supabase/
│           ├── client.ts          # Supabase browser client
│           └── server.ts          # Supabase server client
├── public/                        # Static assets & icons
├── tailwind.config.ts             # Tailwind configuration
└── package.json                   # Dependencies & scripts
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** / **pnpm** / **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/codeninjasph/clinic-natin.git
cd clinic-natin
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- **Landing Page**: `http://localhost:3000/`
- **Patient Discovery**: `http://localhost:3000/discover`
- **Secretary Dashboard**: `http://localhost:3000/dashboard`

---

## 🏥 CDO Pilot Hospital Integrations
- **Maria Reyna Xavier University Hospital** (Hayes St, CDO)
- **Capitol University Medical Center (CUMC)** (Gusa Highway, CDO)
- **Cagayan de Oro Polymedic Plaza** (Kauswagan Highway, CDO)
- **Northern Mindanao Medical Center (NMMC)** (Capitol Compound, CDO)
- **Madonna & Child Hospital** (Carmen, CDO)

---

## ⚠️ Emergency Medical Disclaimer

*Clinic Natin is an outpatient scheduling and queue coordination platform. In the event of an acute or life-threatening medical emergency, patients must proceed immediately to the nearest hospital emergency department or dial **911**.*

---

## 🏢 Operator & Credits

Operated and maintained by **CodeNinjas Web Development Services**.  
For partnerships, doctor onboarding, or clinic inquiries, contact our development team.

&copy; 2026 **Clinic Natin**. All rights reserved.
