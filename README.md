# 🩺 Clinic Natin — Medical Queue Management & EMR Platform

> **Skip the Waiting Room. Track Your Turn from Anywhere.**  
> *Ending the 7:00 AM manual hospital queue in Cagayan de Oro by seamlessly bridging patients, doctors, and clinic secretaries.*

---

## 🌟 Overview

**Clinic Natin** is a modern outpatient queue management and clinical coordination platform designed for medical clinics, private practices, and hospital medical arts centers in the Philippines.

Historically, patients across Northern Mindanao wake up before dawn to stand in long physical lines outside hospital buildings (such as *Maria Reyna Xavier University Hospital*, *Capitol University Medical Center*, *Polymedic Plaza*, and *Northern Mindanao Medical Center*) just to receive a handwritten paper number. 

**Clinic Natin** transforms this experience into a synchronized digital workflow:
- **Patients** reserve official queue tokens online, set up their digital health passport, monitor live queue counters from home, and receive advance SMS arrival alerts.
- **Secretaries** manage queues with one-click calling, verify HMO coverage, issue walk-in tickets, and maintain fair priority lanes.
- **Doctors** review patient vitals and allergies prior to consultation, broadcast delay notices for hospital rounds, and issue digital prescriptions.

---

## 🚀 Key Features

### 1. 🔍 Interactive Doctor Directory & Smart Filtering
- Search verified specialists across Cagayan de Oro by doctor name, medical specialty, hospital location, and consultation schedule.
- Instant filter toggles for **HMO Accreditation** (*Maxicare, Intellicare, Medicard, PhilHealth Konsulta*) and **Live Active Queues**.
- Quick-select specialty pills (*Pediatrics, Internal Medicine, Cardiology, OB-GYN, Dermatology*).

### 2. 🪪 Patient Health Passport & Onboarding Stepper (`/onboarding`)
- **First-Time User Experience (FTUX):** Newly registered patients complete a 4-step digital health passport:
  1. **Vitals & Demographics:** Birthday (with auto-calculated age), biological sex, blood type (`O+`, `A+`, `B+`, `AB+`, etc.), weight in kg, and **Height with Philippine `ft/in` vs `cm` unit toggle**.
  2. **Live BMI Calculator:** Real-time BMI computation with color-coded status pills (*Healthy/Normal*, *Underweight*, *Overweight*, *Obese*).
  3. **Medical Safety & Triage:** Quick-tap badges for common drug allergies (*Penicillin, Aspirin / NSAIDs, Amoxicillin, Sulfa Drugs, Latex, Shellfish*), chronic comorbidities (*Hypertension, Type 2 Diabetes, Asthma*), and maintenance medications.
  4. **Priority & HMO Accreditation:** Priority lane validation under Philippine laws (**RA 9994 Senior Citizen** with OSCA ID, **RA 7277 PWD** with PWD ID, and Pregnant/Maternal), PhilHealth PIN, and HMO card details.
  5. **Emergency Contact & Digital Clinic Pass:** Issues an interactive **Digital Clinic Pass with a visual QR Code** for 1-second check-in at clinic front desks.

### 3. ⏱️ Live Patient Turn Tracker (`/my-queue`)
- Real-time turn progression counter powered by Supabase Realtime websocket subscriptions.
- Recommended departure time calculation based on current doctor consultation pace.
- Direct token search support (e.g. `/my-queue?token=CN-A109`).
- Status timeline (*Booked &rarr; Waiting &rarr; Now Serving &rarr; Completed*).

### 4. 👩‍💼 Clinic Secretary Live Queue Controller (`/secretary/dashboard`)
- Comprehensive receptionist workspace:
  - **Live Queue Controller:** *Call Next Patient*, *Serve Patient*, *Complete Consultation*, *Skip & Re-queue*.
  - **Front-Desk Walk-In Integration:** Issue synchronized digital tickets to patients without smartphones.
  - **Cash Consultation Recording:** Track ₱600+ consultation fees alongside ₱40 platform fees.
  - **Priority Lane Tags:** Dedicated badges for Senior Citizens, PWDs, and emergency patients.

### 5. 👨‍⚕️ Doctor Consultation Suite (`/doctor/dashboard`)
- Attending physician workspace:
  - Active consultation room view with patient chief complaints and pre-populated vitals.
  - **Emergency Delay Broadcast:** Post instant delay notices (e.g. *+30 min delay due to emergency surgery / hospital rounds*) that push directly to all waiting patients.
  - Digital prescription pad entry and patient clinical summaries.

### 6. 🛡️ Role-Based Middleware & 1-Click Demo Personas (`/login`)
- Next.js 16 dynamic proxy middleware (`src/proxy.ts`) with smart gateway:
  - `PATIENT` &rarr; Redirects to `/onboarding` (if incomplete) or `/my-queue`
  - `SECRETARY` / `ADMIN` &rarr; Redirects to `/secretary/dashboard`
  - `DOCTOR` &rarr; Redirects to `/doctor/dashboard`
- **1-Click Demo Personas** for instant testing:
  - **Elena Bautista** (*Secretary &bull; Polymedic Plaza*)
  - **Dr. Maria Santos, MD** (*Attending Physician &bull; Doctor Suite*)
  - **Andres Bonifacio** (*Patient &bull; Active Token #7*)
  - **Juan Dela Cruz** (*New Patient &bull; Demo Health Passport*)

---

## 🎨 Design System & Brand Palette

Built with **shadcn/ui** primitives and custom CSS variables tuned to Clinic Natin's clinical green brand:

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| **`brand-50`** | `#F1FFFA` | Ultra-light mint (Page backgrounds & soft container fills) |
| **`brand-100`** | `#CCFCCB` | Light green (Soft highlights, badges, secondary pills) |
| **`brand-300`** | `#96E6B3` | Seafoam (Accents, active borders, subtle glows) |
| **`brand-700`** | `#568259` | Forest green (Primary buttons, typography, brand accents) |

### shadcn/ui Component Suite (`src/components/ui/`)
- `Accordion` (Interactive landing page FAQ)
- `Carousel` (Hero live preview slider)
- `Card` (Structured containers for doctor directory, triage, and stats)
- `Button` (Type-safe buttons: `default`, `brand`, `outline`, `ghost`, `secondary`)
- `Badge` (Status tags: `brand`, `success`, `warning`, `destructive`, `outline`)
- `Input` (Accessible form inputs with brand focus rings)
- `Select` (Radix UI portal-based dropdowns)
- `Dialog` (Queue booking modal with backdrop blur)
- `Avatar` (Doctor & patient profile avatars with fallback initials)
- `Progress` (Animated onboarding stepper bar)
- `Separator` (Semantic layout dividers)
- `Tabs` (Modular view switchers)

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **UI & Components**: [React 19](https://react.dev/) & [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `class-variance-authority` (cva) & `tailwind-merge`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Slider / Carousel**: [Embla Carousel](https://www.embla-carousel.com/)
- **Database, Auth & Realtime**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Realtime Publications)
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
│   │   ├── dashboard/                 # Smart role-based gateway redirector
│   │   ├── doctor/
│   │   │   └── dashboard/             # Doctor Suite (Consultation & broadcasts)
│   │   ├── login/                     # Portal Sign In with 1-Click Demo Personas
│   │   ├── onboarding/                # Patient Health Passport Stepper & QR Pass
│   │   ├── secretary/
│   │   │   └── dashboard/             # Secretary live queue controller & walk-ins
│   │   ├── signup/                    # Patient self-registration page
│   │   ├── globals.css                # Semantic color tokens & Tailwind utilities
│   │   ├── layout.tsx                 # Root metadata, fonts, and layout
│   │   └── page.tsx                   # Interactive landing page with FAQ & directory
│   ├── components/
│   │   └── ui/                        # Complete shadcn/ui component suite
│   ├── lib/
│   │   ├── supabase/                  # Supabase SSR & browser clients
│   │   └── utils.ts                   # cn() styling helper (clsx + tailwind-merge)
│   └── proxy.ts                       # Next.js 16 role-based authentication proxy
├── supabase/
│   └── schema.sql                     # Production PostgreSQL schema, DDL & triggers
├── public/                            # Static media and favicons
├── package.json                       # Dependencies & build scripts
└── README.md                          # Platform documentation
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** or **pnpm**

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
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Apply Database Migrations (Optional for fresh setup)
Execute `supabase/schema.sql` in your Supabase SQL Editor. It sets up:
- Enums: `user_role`, `queue_session_status`, `appointment_status`, `priority_category`, `platform_payment_status`.
- Tables: `profiles`, `doctors`, `secretaries`, `clinics`, `doctor_clinic_schedules`, `schedule_overrides`, `queue_sessions`, `appointments`, `transactions`, `medical_records`, `prescriptions`, `daily_clinic_summaries`, `audit_logs`, `notification_logs`.
- Triggers: `on_auth_user_before_created` (auto-confirm users) and `on_auth_user_created` (auto-profile generation).
- Realtime replication: `queue_sessions`, `appointments`, `schedule_overrides`.

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):
- **Homepage & Directory**: `http://localhost:3000/`
- **Patient Sign Up**: `http://localhost:3000/signup`
- **Health Passport Onboarding**: `http://localhost:3000/onboarding`
- **Live Patient Turn Tracker**: `http://localhost:3000/my-queue`
- **Secretary Live Queue Suite**: `http://localhost:3000/secretary/dashboard`
- **Doctor Consultation Suite**: `http://localhost:3000/doctor/dashboard`
- **Portal Sign In**: `http://localhost:3000/login`

---

## 🏥 CDO Pilot Hospital Integrations
- **Maria Reyna Xavier University Hospital** (Hayes St, CDO)
- **Capitol University Medical Center (CUMC)** (Gusa Highway, CDO)
- **Cagayan de Oro Polymedic Plaza** (Kauswagan Highway, CDO)
- **Northern Mindanao Medical Center (NMMC)** (Capitol Compound, CDO)
- **Madonna & Child Hospital** (Carmen, CDO)

---

## ⚖️ Compliance & Data Privacy

Clinic Natin is architected in accordance with:
- **Republic Act No. 10173** (Philippine Data Privacy Act of 2012)
- **Republic Act No. 9994** (Expanded Senior Citizens Act — 20% statutory discount & express queueing)
- **Republic Act No. 7277** (Magna Carta for Persons with Disability)
- Strict Row-Level Security (RLS) isolating patient medical records and prescriptions to attending physicians and the patient.

---

## ⚠️ Emergency Medical Disclaimer

*Clinic Natin is an outpatient scheduling and queue coordination platform. In the event of an acute, severe, or life-threatening medical emergency, patients must proceed immediately to the nearest hospital emergency department or dial emergency hotline **911**.*

---

## 🏢 Operator & Credits

Operated and developed by **[CodeNinjas Web Development Services](https://github.com/codeninjasph)**.  
For partnerships, doctor onboarding, or clinic inquiries: `contact@clinicnatin.ph`.

&copy; 2026 **Clinic Natin**. All rights reserved.
