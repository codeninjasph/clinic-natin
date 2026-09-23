import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function generateHospitalCode(name: string): string {
  const clean = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_');
  return clean || `HOSP_${Date.now()}`;
}

// 1. GET: Fetch active hospital facilities (optional ?province=... & ?city=...)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const province = searchParams.get('province');
    const city = searchParams.get('city');

    let query = supabase
      .from('hospitals')
      .select('id, code, name, short_name, address, street, barangay, city, province, doh_license_number, contact_phone, has_er, is_partner, is_active')
      .eq('is_active', true)
      .order('province', { ascending: true })
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (province && province !== 'ALL') {
      query = query.ilike('province', `%${province}%`);
    }

    if (city && city !== 'ALL') {
      query = query.ilike('city', `%${city}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ hospitals: data || [] });
  } catch (err: any) {
    console.error('GET /api/admin/hospitals error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch hospitals' }, { status: 500 });
  }
}

// 2. POST: Create single hospital OR bulk import raw facilities
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await req.json();

    // Check if bulk items array is provided
    if (Array.isArray(body.items) && body.items.length > 0) {
      const recordsToInsert = [];
      const now = new Date().toISOString();

      // Fetch existing codes to ensure unique code constraint
      const { data: existingHospitals } = await supabase.from('hospitals').select('code, name');
      const existingCodes = new Set((existingHospitals || []).map((h) => h.code?.toUpperCase()));
      const existingNames = new Set((existingHospitals || []).map((h) => h.name?.toLowerCase().trim()));

      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        const name = (item.name || item.facilityName || '').trim();
        if (!name) continue;

        // Skip exact duplicate name if requested
        if (existingNames.has(name.toLowerCase())) {
          continue;
        }

        let baseCode = generateHospitalCode(name);
        let uniqueCode = baseCode;
        let counter = 1;
        while (existingCodes.has(uniqueCode)) {
          uniqueCode = `${baseCode}_${counter}`;
          counter++;
        }
        existingCodes.add(uniqueCode);
        existingNames.add(name.toLowerCase());

        const street = (item.street || '').trim();
        const barangay = (item.barangay || '').trim();
        const city = (item.city || item.cityMunicipality || 'Cagayan de Oro').trim();
        const province = (item.province || 'Misamis Oriental').trim();
        const address = [street, barangay, city, province].filter(Boolean).join(', ');

        recordsToInsert.push({
          code: uniqueCode,
          name,
          short_name: (item.shortName || item.short_name || name).trim(),
          street,
          barangay,
          city,
          province,
          address: item.address?.trim() || address,
          contact_phone: item.contactPhone || item.contact_phone || null,
          doh_license_number: item.dohLicenseNumber || item.doh_license_number || null,
          has_er: item.hasEr !== undefined ? Boolean(item.hasEr) : true,
          is_partner: true,
          is_active: true,
        });
      }

      if (recordsToInsert.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'No new facilities to insert (all items were duplicates or empty).',
        });
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('hospitals')
        .insert(recordsToInsert)
        .select();

      if (insertErr) {
        console.error('Bulk hospital insert error:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        count: inserted?.length || recordsToInsert.length,
        hospitals: inserted || [],
      });
    }

    // Single hospital creation
    const {
      name,
      shortName,
      street = '',
      barangay = '',
      city = 'Cagayan de Oro',
      province = 'Misamis Oriental',
      contactPhone,
      dohLicenseNumber,
      hasEr = true,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Facility Name is required.' }, { status: 400 });
    }

    if (!city?.trim() || !province?.trim()) {
      return NextResponse.json({ error: 'City/Municipality and Province are required.' }, { status: 400 });
    }

    // Generate unique code
    const { data: existingHospitals } = await supabase.from('hospitals').select('code');
    const existingCodes = new Set((existingHospitals || []).map((h) => h.code?.toUpperCase()));

    let baseCode = generateHospitalCode(name);
    let uniqueCode = baseCode;
    let counter = 1;
    while (existingCodes.has(uniqueCode)) {
      uniqueCode = `${baseCode}_${counter}`;
      counter++;
    }

    const cleanStreet = street.trim();
    const cleanBarangay = barangay.trim();
    const cleanCity = city.trim();
    const cleanProvince = province.trim();
    const derivedAddress = [cleanStreet, cleanBarangay, cleanCity, cleanProvince]
      .filter(Boolean)
      .join(', ');

    const payload = {
      code: uniqueCode,
      name: name.trim(),
      short_name: (shortName || name).trim(),
      street: cleanStreet || null,
      barangay: cleanBarangay || null,
      city: cleanCity,
      province: cleanProvince,
      address: derivedAddress,
      contact_phone: contactPhone?.trim() || null,
      doh_license_number: dohLicenseNumber?.trim() || null,
      has_er: Boolean(hasEr),
      is_partner: true,
      is_active: true,
    };

    const { data: newHospital, error: createErr } = await supabase
      .from('hospitals')
      .insert(payload)
      .select()
      .single();

    if (createErr) {
      console.error('Single hospital create error:', createErr);
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, hospital: newHospital });
  } catch (err: any) {
    console.error('POST /api/admin/hospitals error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
