import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { PayMongoService } from '@/lib/payments/paymongo';

// ============================================================
// GET /api/admin/finops
// Central financial operations endpoint.
// Query params:
//   view     – 'transactions' (default) | 'summaries' | 'subscriptions' | 'disputes' | 'kpis'
//   channel  – 'ALL' | 'GCASH' | 'MAYA' | 'QRPH' | 'CARD' | etc.
//   status   – 'ALL' | 'SUCCESS' | 'PENDING' | 'REFUNDED' | 'FAILED'
//   search   – substring for patient name, token code, gateway ref
//   dateFrom – YYYY-MM-DD
//   dateTo   – YYYY-MM-DD
//   page     – page number (1-indexed, default 1)
//   limit    – records per page (default 25)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'transactions';

    // ── 1. KPI Aggregates ──────────────────────────────────────
    if (view === 'kpis') {
      const { data: allTx, error: txErr } = await supabase
        .from('transactions')
        .select('id, amount, payment_channel, status, created_at');

      if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

      const txList = allTx || [];
      const settled = txList.filter((t) => t.status === 'SUCCESS');
      const pending = txList.filter((t) => t.status === 'PENDING');
      const refunded = txList.filter((t) => t.status === 'REFUNDED');
      const failed = txList.filter((t) => t.status === 'FAILED');

      const totalSettledAmount = settled.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const pendingAmount = pending.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const refundedAmount = refunded.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const failedAmount = failed.reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Channel breakdown
      const channelMap: Record<string, { count: number; amount: number }> = {};
      settled.forEach((t) => {
        const ch = t.payment_channel || 'OTHER';
        if (!channelMap[ch]) channelMap[ch] = { count: 0, amount: 0 };
        channelMap[ch].count += 1;
        channelMap[ch].amount += Number(t.amount || 0);
      });

      // Subscription MRR
      const { data: doctors } = await supabase
        .from('doctors')
        .select('subscription_tier, pro_tier_active');
      const proCount = (doctors || []).filter((d) => d.subscription_tier === 'pro' && d.pro_tier_active).length;
      const mrr = proCount * 1499; // Standard ₱1,499/month

      return NextResponse.json({
        totalSettledAmount,
        totalSettledCount: settled.length,
        pendingAmount,
        pendingCount: pending.length,
        refundedAmount,
        refundedCount: refunded.length,
        failedAmount,
        failedCount: failed.length,
        totalCount: txList.length,
        channelSplit: channelMap,
        proDoctorCount: proCount,
        monthlySubscriptionRevenue: mrr,
      });
    }

    // ── 2. Daily Cashier Summaries View ────────────────────────
    if (view === 'summaries') {
      const statusFilter = searchParams.get('status');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');

      let query = supabase
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
          notes,
          created_at,
          queue_sessions (
            id,
            session_date,
            status,
            doctors (
              id,
              title,
              specialty,
              profiles ( full_name )
            ),
            clinics (
              id,
              name,
              hospital_name,
              room_number
            )
          ),
          secretaries (
            id,
            profiles ( full_name )
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59Z`);
      }

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Calculate platform deduction and net remittance for each summary
      const formatted = (data || []).map((s: any) => {
        const cash = Number(s.total_cash_collected || 0);
        const onlineCount = Number(s.total_online_bookings || 0);
        const platformDeduction = onlineCount * 50.0; // ₱50 per online booking
        const netRemittance = cash - platformDeduction;

        return {
          id: s.id,
          queueSessionId: s.queue_session_id,
          sessionDate: s.queue_sessions?.session_date || s.created_at?.slice(0, 10),
          doctorName: s.queue_sessions?.doctors?.profiles?.full_name || 'Attending Physician',
          doctorTitle: s.queue_sessions?.doctors?.title || 'Dr.',
          doctorSpecialty: s.queue_sessions?.doctors?.specialty || 'General',
          clinicName: s.queue_sessions?.clinics?.name || 'Clinic',
          hospitalName: s.queue_sessions?.clinics?.hospital_name || 'Hospital Center',
          roomNumber: s.queue_sessions?.clinics?.room_number || '',
          secretaryName: s.secretaries?.profiles?.full_name || 'Clinic Secretary',
          totalPatientsSeen: s.total_patients_seen || 0,
          totalOnlineBookings: onlineCount,
          totalWalkinPatients: s.total_walkin_patients || 0,
          totalPriorityPatients: s.total_priority_patients || 0,
          totalCashCollected: cash,
          totalHmoClaimsCount: s.total_hmo_claims_count || 0,
          platformDeduction,
          netRemittance,
          status: s.status,
          closedAt: s.closed_at,
          notes: s.notes,
          createdAt: s.created_at,
        };
      });

      return NextResponse.json({ summaries: formatted });
    }

    // ── 3. Doctor Subscriptions View ───────────────────────────
    if (view === 'subscriptions') {
      const { data: doctors, error } = await supabase
        .from('doctors')
        .select(`
          id,
          profile_id,
          title,
          specialty,
          consultation_fee_default,
          subscription_tier,
          pro_tier_active,
          subscription_expires_at,
          is_verified,
          created_at,
          profiles (
            id,
            full_name,
            email,
            phone_number,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const docList = (doctors || []).map((d: any) => ({
        id: d.id,
        profileId: d.profile_id,
        fullName: d.profiles?.full_name || 'Doctor',
        title: d.title || 'Dr.',
        specialty: d.specialty || 'General Medicine',
        email: d.profiles?.email || null,
        phone: d.profiles?.phone_number || null,
        consultationFee: Number(d.consultation_fee_default || 500),
        subscriptionTier: d.subscription_tier || 'free',
        proTierActive: Boolean(d.pro_tier_active),
        subscriptionExpiresAt: d.subscription_expires_at,
        isVerified: Boolean(d.is_verified),
        createdAt: d.created_at,
      }));

      const proCount = docList.filter((d) => d.subscriptionTier === 'pro' && d.proTierActive).length;
      const freeCount = docList.length - proCount;
      const mrr = proCount * 1499;

      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoonCount = docList.filter((d) => {
        if (!d.subscriptionExpiresAt) return false;
        const exp = new Date(d.subscriptionExpiresAt);
        return exp > now && exp <= in30Days;
      }).length;

      return NextResponse.json({
        doctors: docList,
        proCount,
        freeCount,
        mrr,
        expiringSoonCount,
      });
    }

    // ── 4. Disputes & Forfeitures View ─────────────────────────
    if (view === 'disputes') {
      // Query appointments with FORFEITED or transactions with FAILED/REFUNDED
      const { data: disputes, error } = await supabase
        .from('appointments')
        .select(`
          id,
          token_code,
          queue_number,
          status,
          platform_payment_status,
          consultation_fee,
          booking_channel,
          priority_notes,
          created_at,
          profiles:patient_id ( id, full_name, phone_number, email ),
          queue_sessions (
            session_date,
            doctors ( id, title, specialty, profiles ( full_name ) ),
            clinics ( id, name, hospital_name )
          ),
          transactions (
            id,
            amount,
            payment_channel,
            gateway_reference,
            paymongo_payment_intent_id,
            status,
            metadata,
            created_at
          )
        `)
        .or('platform_payment_status.eq.FORFEITED,platform_payment_status.eq.REFUNDED,platform_payment_status.eq.PENDING')
        .order('created_at', { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ disputes: disputes || [] });
    }

    // ── 5. Main Transactions Ledger (Default) ──────────────────
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase();
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(`
        id,
        appointment_id,
        amount,
        payment_channel,
        gateway_reference,
        paymongo_payment_intent_id,
        paymongo_client_key,
        status,
        metadata,
        created_at,
        updated_at,
        appointments (
          id,
          token_code,
          queue_number,
          status,
          priority_category,
          consultation_fee,
          platform_payment_status,
          priority_notes,
          created_at,
          profiles:patient_id (
            id,
            full_name,
            phone_number,
            email
          ),
          queue_sessions (
            id,
            session_date,
            doctors (
              id,
              title,
              specialty,
              profiles ( full_name )
            ),
            clinics (
              id,
              name,
              hospital_name,
              room_number
            )
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (channel && channel !== 'ALL') {
      query = query.eq('payment_channel', channel);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59Z`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: txRows, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = (txRows || []).map((t: any) => {
      const apt = t.appointments;
      const patient = apt?.profiles;
      const qs = apt?.queue_sessions;
      const doctor = qs?.doctors;
      const clinic = qs?.clinics;

      return {
        id: t.id,
        appointmentId: t.appointment_id,
        amount: Number(t.amount || 50.0),
        channel: t.payment_channel || 'QRPH',
        gatewayRef: t.gateway_reference || 'N/A',
        paymongoPaymentIntentId: t.paymongo_payment_intent_id || null,
        paymongoClientKey: t.paymongo_client_key || null,
        status: t.status,
        metadata: t.metadata || {},
        createdAt: t.created_at,
        updatedAt: t.updated_at,

        // Appointment context
        tokenCode: apt?.token_code || 'N/A',
        queueNumber: apt?.queue_number || null,
        appointmentStatus: apt?.status || 'N/A',
        platformPaymentStatus: apt?.platform_payment_status || 'PENDING',
        priorityCategory: apt?.priority_category || 'NONE',
        priorityNotes: apt?.priority_notes || null,

        // Patient context
        patientId: patient?.id || null,
        patientName: patient?.full_name || 'Anonymous Patient',
        patientPhone: patient?.phone_number || null,
        patientEmail: patient?.email || null,

        // Doctor context
        doctorId: doctor?.id || null,
        doctorName: doctor?.profiles?.full_name
          ? (doctor.profiles.full_name.startsWith('Dr.') ? doctor.profiles.full_name : `${doctor?.title || 'Dr.'} ${doctor.profiles.full_name}`)
          : 'Attending Physician',
        doctorSpecialty: doctor?.specialty || 'General Medicine',

        // Clinic context
        clinicId: clinic?.id || null,
        clinicName: clinic?.name || 'Main Clinic',
        hospital: clinic?.hospital_name || 'Hospital Center',
        roomNumber: clinic?.room_number || '',
      };
    });

    // Client-side search filtering across joined fields (patientName, tokenCode, gatewayRef)
    if (search) {
      rows = rows.filter(
        (r) =>
          r.patientName.toLowerCase().includes(search) ||
          r.tokenCode.toLowerCase().includes(search) ||
          r.gatewayRef.toLowerCase().includes(search) ||
          r.doctorName.toLowerCase().includes(search)
      );
    }

    // Quick summary KPIs for the header
    const { data: allTx } = await supabase
      .from('transactions')
      .select('amount, payment_channel, status');

    const allTxList = allTx || [];
    const settled = allTxList.filter((t) => t.status === 'SUCCESS');
    const totalSettledAmount = settled.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const refunded = allTxList.filter((t) => t.status === 'REFUNDED');
    const refundedAmount = refunded.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const channelMap: Record<string, number> = {};
    settled.forEach((t) => {
      const ch = t.payment_channel || 'OTHER';
      channelMap[ch] = (channelMap[ch] || 0) + 1;
    });

    return NextResponse.json({
      transactions: rows,
      pagination: {
        page,
        limit,
        total: count || rows.length,
        totalPages: Math.ceil((count || rows.length) / limit),
      },
      kpis: {
        totalSettledAmount,
        totalSettledCount: settled.length,
        refundedAmount,
        refundedCount: refunded.length,
        channelSplit: channelMap,
      },
    });
  } catch (err: unknown) {
    console.error('[GET /api/admin/finops] Internal Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/admin/finops
// Dispatches on `action` field:
//   REFUND             – Calls PayMongo API, updates status to REFUNDED, audit logs
//   RECONCILE_SUMMARY  – Updates daily summary to CLOSED_AND_VERIFIED, audit logs
//   SET_DOCTOR_TIER    – Updates doctor subscription tier and expires_at, audit logs
//   RESOLVE_DISPUTE    – Resolves forfeited/disputed appointment, audit logs
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // ── 1. REFUND ──────────────────────────────────────────────
    if (action === 'REFUND') {
      const { transactionId, reason, adminActor } = body;
      if (!transactionId) {
        return NextResponse.json({ error: 'Transaction ID is required for refund.' }, { status: 400 });
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'A specific reason is required for accounting audit.' }, { status: 400 });
      }

      // Fetch existing transaction
      const { data: tx, error: fetchErr } = await supabase
        .from('transactions')
        .select(`
          id,
          appointment_id,
          amount,
          payment_channel,
          gateway_reference,
          paymongo_payment_intent_id,
          status,
          metadata
        `)
        .eq('id', transactionId)
        .single();

      if (fetchErr || !tx) {
        return NextResponse.json({ error: 'Transaction record not found.' }, { status: 404 });
      }

      if (tx.status === 'REFUNDED') {
        return NextResponse.json({ error: 'This transaction has already been refunded.' }, { status: 400 });
      }

      // Call PayMongo Refund API
      const refundResult = await PayMongoService.createRefund({
        paymentIntentId: tx.paymongo_payment_intent_id || undefined,
        paymentId: tx.gateway_reference?.startsWith('pay_') ? tx.gateway_reference : undefined,
        amountInPhp: Number(tx.amount || 50.0),
        reason: 'requested_by_customer',
        notes: `Admin refund: ${reason}`,
      });

      if (!refundResult.success) {
        return NextResponse.json({
          error: `PayMongo refund failed: ${refundResult.message}`,
        }, { status: 502 });
      }

      const updatedMetadata = {
        ...(tx.metadata || {}),
        refund_info: {
          refund_id: refundResult.refundId,
          refund_status: refundResult.status,
          refund_reason: reason,
          refunded_at: new Date().toISOString(),
          admin_actor: adminActor || 'Admin Ops',
          is_mock: refundResult.isMock || false,
        },
      };

      // Update transactions table
      const { data: updatedTx, error: updateErr } = await supabase
        .from('transactions')
        .update({
          status: 'REFUNDED',
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Update associated appointment platform_payment_status
      if (tx.appointment_id) {
        await supabase
          .from('appointments')
          .update({ platform_payment_status: 'REFUNDED' })
          .eq('id', tx.appointment_id);
      }

      // Record in compliance audit_logs
      await supabase.from('audit_logs').insert({
        table_affected: 'transactions',
        record_id: transactionId,
        action: 'UPDATE',
        old_data: { status: tx.status },
        new_data: {
          status: 'REFUNDED',
          reason,
          refund_id: refundResult.refundId,
          channel: tx.payment_channel,
          amount: tx.amount,
          admin_actor: adminActor || 'Admin Ops',
        },
      });

      return NextResponse.json({
        success: true,
        transaction: updatedTx,
        refundResult,
        message: 'Refund successfully processed and recorded in ledger.',
      });
    }

    // ── 2. RECONCILE_SUMMARY ───────────────────────────────────
    if (action === 'RECONCILE_SUMMARY') {
      const { summaryId, adminNotes, adminActor } = body;
      if (!summaryId) {
        return NextResponse.json({ error: 'Summary ID is required.' }, { status: 400 });
      }

      const { data: summary, error: fetchErr } = await supabase
        .from('daily_clinic_summaries')
        .select('*')
        .eq('id', summaryId)
        .single();

      if (fetchErr || !summary) {
        return NextResponse.json({ error: 'Cashier summary not found.' }, { status: 404 });
      }

      const { data: updated, error: updateErr } = await supabase
        .from('daily_clinic_summaries')
        .update({
          status: 'CLOSED_AND_VERIFIED',
          closed_at: new Date().toISOString(),
          notes: adminNotes ? `${summary.notes ? summary.notes + ' | ' : ''}Verified: ${adminNotes}` : summary.notes,
        })
        .eq('id', summaryId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Write to audit_logs
      await supabase.from('audit_logs').insert({
        table_affected: 'daily_clinic_summaries',
        record_id: summaryId,
        action: 'UPDATE',
        old_data: { status: summary.status },
        new_data: {
          status: 'CLOSED_AND_VERIFIED',
          admin_actor: adminActor || 'Admin Ops',
          notes: adminNotes || 'Reconciliation approved by admin',
          reconciled_at: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        summary: updated,
        message: 'Daily cashier summary successfully marked as reconciled and verified.',
      });
    }

    // ── 3. SET_DOCTOR_TIER ─────────────────────────────────────
    if (action === 'SET_DOCTOR_TIER') {
      const { doctorId, tier, expiresAt, adminActor } = body;
      if (!doctorId || !tier) {
        return NextResponse.json({ error: 'Doctor ID and tier are required.' }, { status: 400 });
      }

      const isPro = tier.toLowerCase() === 'pro';

      const { data: doctor, error: fetchErr } = await supabase
        .from('doctors')
        .select('id, subscription_tier, pro_tier_active, subscription_expires_at')
        .eq('id', doctorId)
        .single();

      if (fetchErr || !doctor) {
        return NextResponse.json({ error: 'Doctor record not found.' }, { status: 404 });
      }

      const { data: updated, error: updateErr } = await supabase
        .from('doctors')
        .update({
          subscription_tier: tier.toLowerCase(),
          pro_tier_active: isPro,
          subscription_expires_at: expiresAt || null,
        })
        .eq('id', doctorId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await supabase.from('audit_logs').insert({
        table_affected: 'doctors',
        record_id: doctorId,
        action: 'UPDATE',
        old_data: {
          subscription_tier: doctor.subscription_tier,
          pro_tier_active: doctor.pro_tier_active,
        },
        new_data: {
          subscription_tier: tier.toLowerCase(),
          pro_tier_active: isPro,
          subscription_expires_at: expiresAt || null,
          admin_actor: adminActor || 'Admin Ops',
        },
      });

      return NextResponse.json({
        success: true,
        doctor: updated,
        message: `Doctor subscription tier updated to ${tier.toUpperCase()}.`,
      });
    }

    // ── 4. RESOLVE_DISPUTE ─────────────────────────────────────
    if (action === 'RESOLVE_DISPUTE') {
      const { appointmentId, resolution, notes, adminActor } = body;
      if (!appointmentId || !resolution) {
        return NextResponse.json({ error: 'Appointment ID and resolution are required.' }, { status: 400 });
      }

      const { data: apt, error: fetchErr } = await supabase
        .from('appointments')
        .select('id, platform_payment_status, priority_notes')
        .eq('id', appointmentId)
        .single();

      if (fetchErr || !apt) {
        return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
      }

      const newStatus = resolution === 'REFUND' ? 'REFUNDED' : 'FORFEITED';

      const { data: updated, error: updateErr } = await supabase
        .from('appointments')
        .update({
          platform_payment_status: newStatus,
          priority_notes: notes ? `${apt.priority_notes ? apt.priority_notes + ' | ' : ''}Dispute Resolution: ${notes}` : apt.priority_notes,
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await supabase.from('audit_logs').insert({
        table_affected: 'appointments',
        record_id: appointmentId,
        action: 'UPDATE',
        old_data: { platform_payment_status: apt.platform_payment_status },
        new_data: {
          platform_payment_status: newStatus,
          resolution,
          notes,
          admin_actor: adminActor || 'Admin Ops',
        },
      });

      return NextResponse.json({
        success: true,
        appointment: updated,
        message: `Dispute resolved: marked as ${newStatus}.`,
      });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error('[POST /api/admin/finops] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
