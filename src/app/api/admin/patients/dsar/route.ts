import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// ============================================================
// POST /api/admin/patients/dsar
// Body must include: { action: 'EXPORT' | 'ERASURE', id: profileId }
//
// EXPORT  – RA 10173 Sec 18: Right to Data Portability
//           Returns structured JSON archive of all profile +
//           appointment history for the data subject.
//
// ERASURE – RA 10173 Sec 16: Right to Erasure
//           Pseudonymizes PII on profiles table.
//           Also anonymizes walk_in_name / walk_in_phone on any
//           appointments record where walk_in_phone matches the
//           subject's phone_number (re-identification prevention).
//           Clinical encounter data (dates, status, fees) preserved
//           per DOH 10-year minimum retention requirement.
//           Writes audit_logs entry.
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id } = body;

    if (!id) return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    if (!action || !['EXPORT', 'ERASURE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be EXPORT or ERASURE.' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Fetch the subject profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select(`
        id, auth_id, role, full_name, phone_number, email, avatar_url,
        date_of_birth, gender, blood_type, weight_kg, height_cm,
        allergies, comorbidities, maintenance_meds,
        priority_category, priority_id_number,
        hmo_provider, hmo_card_number, philhealth_number,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        is_onboarding_completed, confidentiality_agreed_at,
        created_at, updated_at
      `)
      .eq('id', id)
      .maybeSingle();

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Guard: Cannot process ERASURE on already-anonymized profiles
    if (action === 'ERASURE' && profile.full_name?.startsWith('Anonymized')) {
      return NextResponse.json(
        { error: 'This profile has already been anonymized under RA 10173 Section 16.' },
        { status: 400 }
      );
    }

    // ── EXPORT ─────────────────────────────────────────────────
    if (action === 'EXPORT') {
      // Fetch all appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, queue_number, token_code, status, priority_category,
          booking_channel, consultation_fee, platform_payment_status,
          created_at, called_at, completed_at,
          queue_sessions (
            session_date,
            clinics ( name, hospital_name, room_number, city ),
            doctors ( title, specialty, profiles ( full_name ) )
          )
        `)
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      // Fetch transactions
      const appointmentIds = (appointments || []).map((a: any) => a.id);
      let transactions: any[] = [];
      if (appointmentIds.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('id, amount, payment_channel, status, created_at')
          .in('appointment_id', appointmentIds);
        transactions = txData || [];
      }

      // Fetch notification logs
      let notifications: any[] = [];
      if (appointmentIds.length > 0) {
        const { data: notifData } = await supabase
          .from('notification_logs')
          .select('id, notification_type, status, sent_at, created_at')
          .in('appointment_id', appointmentIds);
        notifications = notifData || [];
      }

      const archive = {
        compliance: 'Republic Act No. 10173 (Philippine Data Privacy Act of 2012)',
        provision: 'Section 18 — Right to Data Portability',
        npcCircular: 'NPC Circular 16-01 (Rules and Regulations on the Security of Personal Information)',
        generatedAt: new Date().toISOString(),
        generatedBySystem: 'Clinic Natin Administration Platform v1.0',
        dataSubject: {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          phoneNumber: profile.phone_number,
          dateOfBirth: profile.date_of_birth,
          gender: profile.gender,
          bloodType: profile.blood_type,
          city: null, // not stored at profile level
          priorityCategory: profile.priority_category,
          priorityIdNumber: profile.priority_id_number,
          hmoProvider: profile.hmo_provider,
          philhealthNumber: profile.philhealth_number,
          emergencyContact: {
            name: profile.emergency_contact_name,
            phone: profile.emergency_contact_phone,
            relationship: profile.emergency_contact_relationship,
          },
          onboardingCompleted: profile.is_onboarding_completed,
          privacyConsentTimestamp: profile.confidentiality_agreed_at,
          registeredAt: profile.created_at,
        },
        healthProfile: {
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          allergies: profile.allergies || [],
          comorbidities: profile.comorbidities || [],
          maintenanceMedications: profile.maintenance_meds || [],
        },
        appointmentHistory: (appointments || []).map((a: any) => ({
          id: a.id,
          date: a.queue_sessions?.session_date,
          doctor: a.queue_sessions?.doctors
            ? `${a.queue_sessions.doctors.title} ${a.queue_sessions.doctors.profiles?.full_name}`
            : 'Walk-in',
          specialty: a.queue_sessions?.doctors?.specialty,
          clinic: a.queue_sessions?.clinics
            ? `${a.queue_sessions.clinics.hospital_name} — ${a.queue_sessions.clinics.room_number}`
            : null,
          queueNumber: a.queue_number,
          tokenCode: a.token_code,
          bookingChannel: a.booking_channel,
          status: a.status,
          priorityCategory: a.priority_category,
          consultationFee: a.consultation_fee,
          platformPaymentStatus: a.platform_payment_status,
          createdAt: a.created_at,
          calledAt: a.called_at,
          completedAt: a.completed_at,
        })),
        platformTransactions: transactions.map((t: any) => ({
          id: t.id,
          amount: t.amount,
          channel: t.payment_channel,
          status: t.status,
          date: t.created_at,
        })),
        notificationsSent: notifications.map((n: any) => ({
          type: n.notification_type,
          status: n.status,
          sentAt: n.sent_at,
        })),
        retentionPolicy: {
          identifiersRetainedUntil: 'As requested by data subject under RA 10173 Sec 18',
          clinicalEncountersRetention: 'Minimum 10 years per Department of Health Administrative Order',
        },
      };

      return NextResponse.json({ success: true, archive });
    }

    // ── ERASURE ─────────────────────────────────────────────────
    if (action === 'ERASURE') {
      const subjectPhone = profile.phone_number;
      const subjectName = profile.full_name;
      const subjectEmail = profile.email;

      // 1. Pseudonymize the profiles record
      const { error: eraseErr } = await supabase
        .from('profiles')
        .update({
          full_name: 'Anonymized Subject (RA 10173 Sec 16)',
          email: `erased-${Date.now()}@privacy.gov.ph`,
          phone_number: '+63 000 000 0000',
          avatar_url: null,
          date_of_birth: null,
          gender: null,
          blood_type: null,
          weight_kg: null,
          height_cm: null,
          allergies: [],
          comorbidities: [],
          maintenance_meds: [],
          priority_id_number: null,
          hmo_provider: null,
          hmo_card_number: null,
          philhealth_number: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (eraseErr) {
        console.error('Erasure profiles update error:', eraseErr);
        return NextResponse.json({ error: eraseErr.message }, { status: 500 });
      }

      // 2. Anonymize walk-in appointment records where walk_in_phone matches
      //    subject's phone number (re-identification prevention)
      let walkInAnonymizedCount = 0;
      if (subjectPhone && subjectPhone !== '+63 000 000 0000') {
        const { data: walkInRows, error: walkInFetchErr } = await supabase
          .from('appointments')
          .select('id')
          .eq('walk_in_phone', subjectPhone);

        if (!walkInFetchErr && walkInRows && walkInRows.length > 0) {
          const walkInIds = walkInRows.map((r: any) => r.id);
          const { error: walkInEraseErr } = await supabase
            .from('appointments')
            .update({
              walk_in_name: 'Anonymized (RA 10173 Sec 16)',
              walk_in_phone: '+63 000 000 0000',
            })
            .in('id', walkInIds);

          if (walkInEraseErr) {
            console.error('Walk-in anonymization error:', walkInEraseErr);
            // Non-fatal: continue and log the partial erasure
          } else {
            walkInAnonymizedCount = walkInIds.length;
          }
        }
      }

      // 3. Write formal audit log entry to Supabase
      await supabase.from('audit_logs').insert({
        table_affected: 'profiles',
        record_id: id,
        action: 'UPDATE',
        old_data: {
          full_name: subjectName,
          email: subjectEmail,
          phone_number: subjectPhone,
          erasure_scope: 'profiles table PII + walk_in appointment records',
        },
        new_data: {
          full_name: 'Anonymized Subject (RA 10173 Sec 16)',
          email: 'erased@privacy.gov.ph',
          phone_number: '+63 000 000 0000',
          walk_in_records_anonymized: walkInAnonymizedCount,
          erasure_executed_at: new Date().toISOString(),
          legal_basis: 'Republic Act No. 10173 Section 16 — Right to Erasure and Blocking',
          clinical_records_preserved: true,
          doh_retention_note: 'Consultation encounter records retained per DOH 10-year minimum requirement',
        },
      });

      return NextResponse.json({
        success: true,
        message: `RA 10173 Section 16 erasure executed. ${walkInAnonymizedCount} walk-in record(s) also anonymized.`,
        walkInAnonymizedCount,
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/admin/patients/dsar error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
