import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'specialties') {
      const { data, error } = await supabase
        .from('medical_specialties')
        .select(`
          id,
          code,
          name,
          category,
          display_order,
          medical_subspecialties (
            id,
            code,
            name
          )
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ specialties: data || [] });
    }

    if (type === 'hospitals') {
      const { data, error } = await supabase
        .from('hospitals')
        .select('id, code, name, short_name, address, city, province, doh_license_number, contact_phone, has_er, is_partner')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ hospitals: data || [] });
    }

    if (type === 'board_certifications') {
      const { data, error } = await supabase
        .from('board_certifications')
        .select('id, code, society_name, abbreviation, specialty_id')
        .eq('is_active', true)
        .order('society_name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ boardCertifications: data || [] });
    }

    if (type === 'hmo_providers') {
      const { data, error } = await supabase
        .from('hmo_providers')
        .select('id, code, name, short_name, requires_prior_auth, contact_desk')
        .eq('is_active', true)
        .order('short_name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ hmoProviders: data || [] });
    }

    // Default: Fetch all reference tables in parallel
    const [specialtiesRes, hospitalsRes, boardCertRes, hmoRes] = await Promise.all([
      supabase
        .from('medical_specialties')
        .select(`
          id,
          code,
          name,
          category,
          display_order,
          medical_subspecialties (
            id,
            code,
            name
          )
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),

      supabase
        .from('hospitals')
        .select('id, code, name, short_name, address, city, province, doh_license_number, contact_phone, has_er, is_partner')
        .eq('is_active', true)
        .order('name', { ascending: true }),

      supabase
        .from('board_certifications')
        .select('id, code, society_name, abbreviation, specialty_id')
        .eq('is_active', true)
        .order('society_name', { ascending: true }),

      supabase
        .from('hmo_providers')
        .select('id, code, name, short_name, requires_prior_auth, contact_desk')
        .eq('is_active', true)
        .order('short_name', { ascending: true }),
    ]);

    if (specialtiesRes.error) throw specialtiesRes.error;
    if (hospitalsRes.error) throw hospitalsRes.error;
    if (boardCertRes.error) throw boardCertRes.error;
    if (hmoRes.error) throw hmoRes.error;

    return NextResponse.json({
      specialties: specialtiesRes.data || [],
      hospitals: hospitalsRes.data || [],
      boardCertifications: boardCertRes.data || [],
      hmoProviders: hmoRes.data || [],
    });
  } catch (err: any) {
    console.error('Error fetching lookups:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch lookups' }, { status: 500 });
  }
}
