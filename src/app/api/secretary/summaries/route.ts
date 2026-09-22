import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface DenominationBill {
  value: number;
  label: string;
  qty: string | number;
  subtotal?: number;
}

interface DenominationBreakdownData {
  bills: DenominationBill[];
  coins: number;
  physicalCashCounted: number;
  systemExpectedCash: number;
  discrepancy: number;
  submittedBy: string;
  submittedAt: string;
  closingRemarks?: string;
}

function parseNotesBreakdown(rawNotes: string | null | undefined): {
  breakdown: DenominationBreakdownData | null;
  plainNotes: string;
} {
  if (!rawNotes) return { breakdown: null, plainNotes: '' };

  const prefix = '[METADATA_V1]:';
  if (rawNotes.startsWith(prefix)) {
    try {
      const newlineIndex = rawNotes.indexOf('\n');
      const jsonStr = newlineIndex === -1 ? rawNotes.slice(prefix.length) : rawNotes.slice(prefix.length, newlineIndex);
      const parsed = JSON.parse(jsonStr) as DenominationBreakdownData;
      const plainNotes = newlineIndex === -1 ? '' : rawNotes.slice(newlineIndex + 1).trim();
      return { breakdown: parsed, plainNotes };
    } catch {
      return { breakdown: null, plainNotes: rawNotes };
    }
  }

  return { breakdown: null, plainNotes: rawNotes };
}

// ── GET /api/secretary/summaries ───────────────────────────────────────
// Query params:
//   sessionId – fetch summary for this specific queue_session
//   doctorId  – fetch historical summaries for this doctor
//   limit     – max past summaries (default 10)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const doctorId = searchParams.get('doctorId');
    const history = searchParams.get('history') === 'true';

    // 1. Fetch historical summaries
    if (history && doctorId) {
      const limit = parseInt(searchParams.get('limit') || '15', 10);
      const { data, error } = await supabase
        .from('daily_clinic_summaries')
        .select(`
          id,
          queue_session_id,
          secretary_id,
          total_patients_seen,
          total_online_bookings,
          total_walkin_patients,
          total_priority_patients,
          total_cash_collected,
          total_hmo_claims_count,
          status,
          closed_at,
          created_at,
          notes,
          queue_sessions!inner (
            id,
            session_date,
            status,
            doctor_id,
            clinics ( id, name, hospital_name, room_number )
          ),
          secretaries ( id, profiles ( full_name ) )
        `)
        .eq('queue_sessions.doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[API /secretary/summaries GET history error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summaries = (data || []).map((row: any) => {
        const { breakdown, plainNotes } = parseNotesBreakdown(row.notes);
        return {
          id: row.id,
          queueSessionId: row.queue_session_id,
          sessionDate: row.queue_sessions?.session_date,
          sessionStatus: row.queue_sessions?.status,
          clinicName: row.queue_sessions?.clinics?.name,
          hospitalName: row.queue_sessions?.clinics?.hospital_name,
          roomNumber: row.queue_sessions?.clinics?.room_number,
          secretaryName: row.secretaries?.profiles?.full_name || breakdown?.submittedBy || 'Clinic Secretary',
          totalPatientsSeen: row.total_patients_seen,
          totalOnlineBookings: row.total_online_bookings,
          totalWalkinPatients: row.total_walkin_patients,
          totalPriorityPatients: row.total_priority_patients,
          totalCashCollected: Number(row.total_cash_collected || 0),
          totalHmoClaimsCount: row.total_hmo_claims_count,
          status: row.status,
          closedAt: row.closed_at,
          createdAt: row.created_at,
          notes: plainNotes,
          rawNotes: row.notes,
          breakdown,
        };
      });

      return NextResponse.json({ summaries });
    }

    // 2. Fetch summary for a single queue session
    if (sessionId) {
      const { data, error } = await supabase
        .from('daily_clinic_summaries')
        .select(`
          id,
          queue_session_id,
          secretary_id,
          total_patients_seen,
          total_online_bookings,
          total_walkin_patients,
          total_priority_patients,
          total_cash_collected,
          total_hmo_claims_count,
          status,
          closed_at,
          created_at,
          notes,
          secretaries ( id, profiles ( full_name ) )
        `)
        .eq('queue_session_id', sessionId)
        .maybeSingle();

      if (error) {
        console.error('[API /secretary/summaries GET session error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ summary: null });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = data as any;
      const { breakdown, plainNotes } = parseNotesBreakdown(row.notes);

      return NextResponse.json({
        summary: {
          id: row.id,
          queueSessionId: row.queue_session_id,
          secretaryId: row.secretary_id,
          secretaryName: row.secretaries?.profiles?.full_name || breakdown?.submittedBy || 'Clinic Secretary',
          totalPatientsSeen: row.total_patients_seen,
          totalOnlineBookings: row.total_online_bookings,
          totalWalkinPatients: row.total_walkin_patients,
          totalPriorityPatients: row.total_priority_patients,
          totalCashCollected: Number(row.total_cash_collected || 0),
          totalHmoClaimsCount: row.total_hmo_claims_count,
          status: row.status,
          closedAt: row.closed_at,
          createdAt: row.created_at,
          notes: plainNotes,
          rawNotes: row.notes,
          breakdown,
        },
      });
    }

    return NextResponse.json({ error: 'Provide either sessionId or (history=true and doctorId)' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[API /secretary/summaries GET uncaught]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ── POST /api/secretary/summaries ──────────────────────────────────────
// Submits or updates an End-of-Day Cash Drawer Reconciliation summary
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await req.json();

    const {
      queueSessionId,
      secretaryId,
      signerName,
      denominations,
      coinsTotal,
      physicalCashCounted,
      systemExpectedCash,
      cashDifference,
      totalPatientsSeen,
      totalOnlineBookings,
      totalWalkinPatients,
      totalPriorityPatients,
      totalHmoClaimsCount,
      closingNotes,
    } = body;

    if (!queueSessionId) {
      return NextResponse.json({ error: 'queueSessionId is required' }, { status: 400 });
    }

    // Prepare structured breakdown metadata
    const breakdownData: DenominationBreakdownData = {
      bills: denominations || [],
      coins: parseFloat(coinsTotal) || 0,
      physicalCashCounted: Number(physicalCashCounted) || 0,
      systemExpectedCash: Number(systemExpectedCash) || 0,
      discrepancy: Number(cashDifference) || 0,
      submittedBy: signerName || 'Clinic Secretary',
      submittedAt: new Date().toISOString(),
      closingRemarks: closingNotes || '',
    };

    const notesFormatted = `[METADATA_V1]:${JSON.stringify(breakdownData)}\n${
      closingNotes ? closingNotes.trim() + ' | ' : ''
    }Signed by: ${signerName || 'Clinic Secretary'}`;

    // Check if a summary already exists for this queue session
    const { data: existing } = await supabase
      .from('daily_clinic_summaries')
      .select('id, status, notes')
      .eq('queue_session_id', queueSessionId)
      .maybeSingle();

    // If already CLOSED_AND_VERIFIED by finops, protect the verification status
    const targetStatus = existing?.status === 'CLOSED_AND_VERIFIED' ? 'CLOSED_AND_VERIFIED' : 'OPEN';

    const payload = {
      queue_session_id: queueSessionId,
      secretary_id: secretaryId || null,
      total_patients_seen: Number(totalPatientsSeen) || 0,
      total_online_bookings: Number(totalOnlineBookings) || 0,
      total_walkin_patients: Number(totalWalkinPatients) || 0,
      total_priority_patients: Number(totalPriorityPatients) || 0,
      total_cash_collected: Number(physicalCashCounted) > 0 ? Number(physicalCashCounted) : Number(systemExpectedCash) || 0,
      total_hmo_claims_count: Number(totalHmoClaimsCount) || 0,
      status: targetStatus,
      closed_at: new Date().toISOString(),
      notes: notesFormatted,
    };

    let summaryId = existing?.id;

    if (existing) {
      const { data: updated, error: updateErr } = await supabase
        .from('daily_clinic_summaries')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) {
        console.error('[API /secretary/summaries POST updateErr]:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      summaryId = updated.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('daily_clinic_summaries')
        .insert(payload)
        .select()
        .single();

      if (insertErr) {
        console.error('[API /secretary/summaries POST insertErr]:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      summaryId = inserted.id;
    }

    // Write to audit_logs for RA 10173 & financial accountability
    try {
      await supabase.from('audit_logs').insert({
        table_affected: 'daily_clinic_summaries',
        record_id: summaryId,
        action: existing ? 'UPDATE' : 'INSERT',
        new_data: {
          queue_session_id: queueSessionId,
          physical_cash_counted: physicalCashCounted,
          system_expected_cash: systemExpectedCash,
          discrepancy: cashDifference,
          signer: signerName,
          status: targetStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('[API /secretary/summaries] Audit log write failed non-fatally:', auditErr);
    }

    return NextResponse.json({
      success: true,
      summaryId,
      status: targetStatus,
      breakdown: breakdownData,
      message: 'Daily cash drawer summary successfully recorded.',
    });
  } catch (err: unknown) {
    console.error('[API /secretary/summaries POST uncaught]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
