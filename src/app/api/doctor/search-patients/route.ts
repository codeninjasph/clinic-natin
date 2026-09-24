import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export interface PatientSearchResult {
  id: string | null; // Profile UUID (null for unlinked walk-ins)
  fullName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  allergies: string[];
  appointmentId: string | null;
  tokenCode: string | null;
  queueStatus: string | null;
  queueNumber: number | null;
  isQueued: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    // 1. Fetch today's / active queue appointments
    const { data: queueAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('id, token_code, queue_number, status, walk_in_name, walk_in_phone, patient_id, created_at, profiles:patient_id(id, full_name, phone_number, date_of_birth, gender, allergies)')
      .in('status', ['SERVING', 'WAITING', 'BUFFERED', 'BOOKED', 'COMPLETED'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (apptError) {
      console.error('[search-patients] Error fetching appointments:', apptError);
    }

    // 2. Fetch registered profiles matching query
    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, phone_number, date_of_birth, gender, allergies, priority_category')
      .eq('role', 'PATIENT')
      .order('full_name', { ascending: true })
      .limit(20);

    if (query) {
      // Use or filter for name or phone
      profilesQuery = profilesQuery.or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`);
    }

    const { data: matchedProfiles, error: profError } = await profilesQuery;
    if (profError) {
      console.error('[search-patients] Error fetching profiles:', profError);
    }

    // Helper to calculate age from DOB
    const calcAge = (dobString: string | null): number | null => {
      if (!dobString) return null;
      const dob = new Date(dobString);
      if (isNaN(dob.getTime())) return null;
      const diffMs = Date.now() - dob.getTime();
      return Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
    };

    const results: PatientSearchResult[] = [];
    const addedPatientIds = new Set<string>();

    // 3. Process active queue appointments first
    (queueAppointments || []).forEach((appt) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prof = (appt as any).profiles;
      const patientId = appt.patient_id;
      const fullName = prof?.full_name || appt.walk_in_name || `Patient ${appt.token_code}`;
      const phone = prof?.phone_number || appt.walk_in_phone || null;

      // If query is provided, check if appointment matches
      if (query) {
        const qLower = query.toLowerCase();
        const matchesName = fullName.toLowerCase().includes(qLower);
        const matchesPhone = phone ? phone.toLowerCase().includes(qLower) : false;
        const matchesToken = appt.token_code ? appt.token_code.toLowerCase().includes(qLower) : false;
        if (!matchesName && !matchesPhone && !matchesToken) {
          return;
        }
      }

      if (patientId) {
        if (addedPatientIds.has(patientId)) {
          return;
        }
        addedPatientIds.add(patientId);
      }

      results.push({
        id: patientId || null,
        fullName,
        phoneNumber: phone,
        dateOfBirth: prof?.date_of_birth || null,
        age: calcAge(prof?.date_of_birth),
        gender: prof?.gender || null,
        allergies: prof?.allergies || [],
        appointmentId: appt.id,
        tokenCode: appt.token_code,
        queueStatus: appt.status,
        queueNumber: appt.queue_number,
        isQueued: true,
      });
    });

    // 4. Process matched registered profiles not already in the active queue list
    (matchedProfiles || []).forEach((prof) => {
      if (addedPatientIds.has(prof.id)) return;
      addedPatientIds.add(prof.id);

      results.push({
        id: prof.id,
        fullName: prof.full_name,
        phoneNumber: prof.phone_number,
        dateOfBirth: prof.date_of_birth,
        age: calcAge(prof.date_of_birth),
        gender: prof.gender,
        allergies: prof.allergies || [],
        appointmentId: null,
        tokenCode: null,
        queueStatus: null,
        queueNumber: null,
        isQueued: false,
      });
    });

    // 5. Sort: SERVING first, then CALLED, then WAITING, then queued, then registered alphabetical
    results.sort((a, b) => {
      const getPriority = (item: PatientSearchResult) => {
        if (item.queueStatus === 'SERVING') return 1;
        if (item.queueStatus === 'CALLED') return 2;
        if (item.queueStatus === 'WAITING' || item.queueStatus === 'BUFFERED') return 3;
        if (item.isQueued) return 4;
        return 5;
      };

      const prioDiff = getPriority(a) - getPriority(b);
      if (prioDiff !== 0) return prioDiff;
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({
      success: true,
      patients: results,
      total: results.length,
    });
  } catch (error) {
    console.error('[search-patients] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
