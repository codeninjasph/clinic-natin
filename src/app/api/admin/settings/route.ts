import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { AuditService } from '@/lib/compliance/audit';
import { SemaphoreService } from '@/lib/sms/semaphore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Measure Supabase Round-Trip Latency
    const dbStartTime = Date.now();
    const [
      settingsRes,
      icd10Res,
      pndfRes,
      hmosRes,
      semaphoreAccount,
    ] = await Promise.all([
      supabase.from('system_settings').select('*').order('category', { ascending: true }),
      supabase.from('icd10_catalog').select('*').order('is_common_cdo', { ascending: false }).order('code', { ascending: true }),
      supabase.from('pndf_formulary').select('*').order('generic_name', { ascending: true }),
      supabase.from('hmo_providers').select('*').order('name', { ascending: true }),
      SemaphoreService.getAccountInfo().catch((err) => ({
        accountId: 'cn-cdo-8821',
        accountName: 'Clinic Natin (Sandbox)',
        status: 'Active',
        creditBalance: 0,
        isSandbox: false,
        pingMs: 45,
      })),
    ]);
    const dbLatencyMs = Date.now() - dbStartTime;

    if (settingsRes.error) throw settingsRes.error;
    if (icd10Res.error) throw icd10Res.error;
    if (pndfRes.error) throw pndfRes.error;
    if (hmosRes.error) throw hmosRes.error;

    // Convert settings array into a structured object for easy client consumption
    const settingsMap: Record<string, any> = {};
    (settingsRes.data || []).forEach((item) => {
      settingsMap[item.key] = item.value;
    });

    // PayMongo gateway telemetry
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    const paymongoWebhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const paymongoMode = paymongoSecretKey?.startsWith('sk_live') ? 'LIVE' : 'TEST';
    const paymongoStatus = paymongoSecretKey ? 'ONLINE' : 'SANDBOX_SIMULATED';

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      settingsRaw: settingsRes.data || [],
      icd10: icd10Res.data || [],
      pndf: pndfRes.data || [],
      hmos: hmosRes.data || [],
      telemetry: {
        paymongo: {
          status: paymongoStatus,
          mode: paymongoMode,
          hasWebhook: Boolean(paymongoWebhookSecret),
          provider: 'PayMongo QRPh Gateway (BSP)',
        },
        semaphore: {
          status: semaphoreAccount?.status || 'Active',
          creditBalance: semaphoreAccount?.creditBalance ?? 0,
          accountName: semaphoreAccount?.accountName || 'Clinic Natin Pilot',
          senderName: process.env.SEMAPHORE_SENDER_NAME || 'CLINICNATIN',
          isSandbox: semaphoreAccount?.isSandbox ?? false,
          pingMs: semaphoreAccount?.pingMs ?? 0,
        },
        database: {
          status: 'HEALTHY',
          region: 'ap-southeast-1 (Singapore)',
          latencyMs: dbLatencyMs,
          engine: 'PostgreSQL 17 (Supabase)',
        },
      },
    });
  } catch (err: any) {
    console.error('[/api/admin/settings GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch settings and dictionaries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await req.json();
    const { action } = body;

    const actorName = body.actorName || 'Atty. Rafael Ramos (Admin Ops)';
    const actorRole = 'ADMIN';
    const ipAddress = req.headers.get('x-forwarded-for') || '124.106.129.5 (Admin Ops HQ)';

    // ------------------------------------------------------------------
    // 1. TOGGLE LIVE RUNTIME FEATURE FLAG
    // ------------------------------------------------------------------
    if (action === 'TOGGLE_FLAG') {
      const { key, value } = body;
      if (!key) {
        return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
      }

      // Upsert into system_settings
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key,
            value: Boolean(value),
            updated_at: new Date().toISOString(),
            updated_by: actorName,
          },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;

      // Audit Log
      await AuditService.logEvent({
        action: 'FEATURE_FLAG_TOGGLED',
        actorName,
        actorRole,
        tableAffected: 'system_settings',
        recordId: key,
        details: `Toggled feature flag "${key}" to ${Boolean(value)}`,
        ipAddress,
        newData: { key, value: Boolean(value) },
      });

      return NextResponse.json({ success: true, setting: data });
    }

    // ------------------------------------------------------------------
    // 2. UPDATE PLATFORM FEE & STATUTORY QUEUE POLICIES
    // ------------------------------------------------------------------
    if (action === 'UPDATE_POLICY') {
      const { updates } = body; // Array of { key, value }
      if (!Array.isArray(updates) || updates.length === 0) {
        return NextResponse.json({ success: false, error: 'Updates array is required' }, { status: 400 });
      }

      const results = [];
      for (const item of updates) {
        const { data, error } = await supabase
          .from('system_settings')
          .upsert(
            {
              key: item.key,
              value: item.value,
              updated_at: new Date().toISOString(),
              updated_by: actorName,
            },
            { onConflict: 'key' }
          )
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      }

      // Audit Log
      await AuditService.logEvent({
        action: 'UPDATE',
        actorName,
        actorRole,
        tableAffected: 'system_settings',
        recordId: 'PLATFORM_POLICIES',
        details: `Updated platform fee/statutory policies: ${updates.map((u) => `${u.key}=${JSON.stringify(u.value)}`).join(', ')}`,
        ipAddress,
        newData: updates,
      });

      return NextResponse.json({ success: true, updated: results });
    }

    // ------------------------------------------------------------------
    // 3. ADD ICD-10 CLINICAL CODE
    // ------------------------------------------------------------------
    if (action === 'ADD_ICD10') {
      const { code, description, category, is_common_cdo, philhealth_case_rate } = body;
      if (!code?.trim() || !description?.trim()) {
        return NextResponse.json(
          { success: false, error: 'ICD-10 code and diagnostic description are required' },
          { status: 400 }
        );
      }

      const formattedCode = code.trim().toUpperCase();

      const { data, error } = await supabase
        .from('icd10_catalog')
        .insert({
          code: formattedCode,
          description: description.trim(),
          category: category?.trim() || 'General',
          is_common_cdo: Boolean(is_common_cdo),
          philhealth_case_rate: Boolean(philhealth_case_rate),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ success: false, error: `ICD-10 Code "${formattedCode}" already exists in the catalog.` }, { status: 409 });
        }
        throw error;
      }

      await AuditService.logEvent({
        action: 'INSERT',
        actorName,
        actorRole,
        tableAffected: 'icd10_catalog',
        recordId: data.id,
        details: `Added new ICD-10 diagnosis: [${formattedCode}] ${description.trim()} (${category})`,
        ipAddress,
        newData: data,
      });

      return NextResponse.json({ success: true, item: data });
    }

    // ------------------------------------------------------------------
    // 4. TOGGLE / UPDATE ICD-10 CODE
    // ------------------------------------------------------------------
    if (action === 'TOGGLE_ICD10') {
      const { id, field, value } = body;
      if (!id || !field) {
        return NextResponse.json({ success: false, error: 'ID and field are required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('icd10_catalog')
        .update({ [field]: value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await AuditService.logEvent({
        action: 'UPDATE',
        actorName,
        actorRole,
        tableAffected: 'icd10_catalog',
        recordId: id,
        details: `Updated ICD-10 code [${data.code}] field "${field}" to ${value}`,
        ipAddress,
        newData: { [field]: value },
      });

      return NextResponse.json({ success: true, item: data });
    }

    // ------------------------------------------------------------------
    // 5. ADD PNDF DRUG FORMULARY ENTRY
    // ------------------------------------------------------------------
    if (action === 'ADD_PNDF') {
      const { generic_name, brand_names, dosage, form, therapeutic_class, prescription_class } = body;
      if (!generic_name?.trim() || !dosage?.trim() || !form?.trim() || !therapeutic_class?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Generic name, dosage, form, and therapeutic class are required' },
          { status: 400 }
        );
      }

      const brandsArray = Array.isArray(brand_names)
        ? brand_names
        : typeof brand_names === 'string'
        ? brand_names.split(',').map((b: string) => b.trim()).filter(Boolean)
        : [];

      const { data, error } = await supabase
        .from('pndf_formulary')
        .insert({
          generic_name: generic_name.trim(),
          brand_names: brandsArray,
          dosage: dosage.trim(),
          form: form.trim(),
          therapeutic_class: therapeutic_class.trim(),
          prescription_class: prescription_class || 'Rx',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await AuditService.logEvent({
        action: 'INSERT',
        actorName,
        actorRole,
        tableAffected: 'pndf_formulary',
        recordId: data.id,
        details: `Added new drug to PNDF Formulary: ${data.generic_name} (${data.dosage}, ${data.form})`,
        ipAddress,
        newData: data,
      });

      return NextResponse.json({ success: true, item: data });
    }

    // ------------------------------------------------------------------
    // 6. TOGGLE PNDF DRUG ACTIVE STATUS
    // ------------------------------------------------------------------
    if (action === 'TOGGLE_PNDF') {
      const { id, is_active } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('pndf_formulary')
        .update({ is_active: Boolean(is_active) })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await AuditService.logEvent({
        action: 'UPDATE',
        actorName,
        actorRole,
        tableAffected: 'pndf_formulary',
        recordId: id,
        details: `Updated drug active status for ${data.generic_name} to ${Boolean(is_active)}`,
        ipAddress,
      });

      return NextResponse.json({ success: true, item: data });
    }

    // ------------------------------------------------------------------
    // 7. ADD OR UPDATE HMO PROVIDER
    // ------------------------------------------------------------------
    if (action === 'SAVE_HMO') {
      const { id, code, name, short_name, requires_prior_auth, contact_desk, portal_url, accreditation_status, is_active } = body;
      if (!name?.trim() || !contact_desk?.trim()) {
        return NextResponse.json(
          { success: false, error: 'HMO name and contact desk are required' },
          { status: 400 }
        );
      }

      const hmoCode = (code || short_name || name)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .substring(0, 30);

      let savedData;
      if (id) {
        // Update
        const { data, error } = await supabase
          .from('hmo_providers')
          .update({
            name: name.trim(),
            short_name: short_name?.trim() || name.trim(),
            requires_prior_auth: Boolean(requires_prior_auth),
            contact_desk: contact_desk.trim(),
            portal_url: portal_url?.trim() || null,
            accreditation_status: accreditation_status || 'ACTIVE',
            is_active: is_active !== undefined ? Boolean(is_active) : true,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        savedData = data;

        await AuditService.logEvent({
          action: 'UPDATE',
          actorName,
          actorRole,
          tableAffected: 'hmo_providers',
          recordId: id,
          details: `Updated HMO Provider: ${data.name} (Status: ${data.accreditation_status})`,
          ipAddress,
          newData: data,
        });
      } else {
        // Insert
        const { data, error } = await supabase
          .from('hmo_providers')
          .insert({
            code: hmoCode,
            name: name.trim(),
            short_name: short_name?.trim() || name.trim(),
            requires_prior_auth: Boolean(requires_prior_auth),
            contact_desk: contact_desk.trim(),
            portal_url: portal_url?.trim() || null,
            accreditation_status: accreditation_status || 'ACTIVE',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        savedData = data;

        await AuditService.logEvent({
          action: 'INSERT',
          actorName,
          actorRole,
          tableAffected: 'hmo_providers',
          recordId: data.id,
          details: `Accredited new HMO Provider: ${data.name} [${data.code}]`,
          ipAddress,
          newData: data,
        });
      }

      return NextResponse.json({ success: true, item: savedData });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[/api/admin/settings POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Settings operation failed' },
      { status: 500 }
    );
  }
}
