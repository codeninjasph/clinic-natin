import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// 1. GET: Fetch all clinics (or single clinic by ?id=...) with doctor schedules & queue status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const selectQuery = `
      id,
      name,
      hospital_name,
      building_name,
      floor_number,
      room_number,
      address,
      city,
      province,
      contact_phone,
      is_verified,
      operating_hours,
      status,
      hospital_id,
      created_at,
      hospitals (
        id,
        code,
        name,
        short_name,
        doh_license_number,
        contact_phone,
        has_er
      ),
      doctor_clinic_schedules (
        id,
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        max_patients,
        is_active,
        doctors (
          id,
          title,
          specialty,
          subspecialty,
          profiles (
            id,
            full_name,
            email,
            phone_number,
            avatar_url
          ),
          doctor_clinic_schedules (
            id,
            clinic_id,
            day_of_week,
            start_time,
            end_time,
            clinics (
              id,
              name,
              hospital_name,
              room_number
            )
          )
        )
      ),
      queue_sessions (
        id,
        status,
        current_serving_number,
        session_date,
        accepting_walkins,
        accepting_online,
        announcement_notice,
        last_updated_at
      )
    `;

    if (id) {
      let clinicData: any = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      if (isUUID) {
        const { data, error } = await supabase
          .from('clinics')
          .select(selectQuery)
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Supabase single clinic fetch error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        clinicData = data;
      }

      // Fallback lookup by matching room number or name if not a direct UUID
      if (!clinicData) {
        const cleanSlug = id.replace(/^clinic-/, '').replace(/-/g, ' ').trim();
        const digitsMatch = id.match(/\d+/);
        const orConditions = [`room_number.ilike.%${cleanSlug}%`, `name.ilike.%${cleanSlug}%`];
        if (digitsMatch) {
          orConditions.push(`room_number.ilike.%${digitsMatch[0]}%`);
        }

        const { data } = await supabase
          .from('clinics')
          .select(selectQuery)
          .or(orConditions.join(','))
          .limit(1)
          .maybeSingle();
        clinicData = data;
      }

      if (!clinicData) {
        return NextResponse.json({ error: 'Clinic room not found' }, { status: 404 });
      }

      return NextResponse.json({ clinic: clinicData, data: clinicData });
    }

    const { data, error } = await supabase
      .from('clinics')
      .select(selectQuery)
      .order('hospital_name', { ascending: true })
      .order('room_number', { ascending: true });

    if (error) {
      console.error('Supabase clinics fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clinics: data || [] });
  } catch (err: any) {
    console.error('GET clinics error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create a new clinic / consultation room in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      hospitalName,
      hospitalId,
      buildingName = 'Medical Arts Building',
      floorNumber = '2nd Floor',
      roomNumber,
      address,
      city = 'Cagayan de Oro',
      province = 'Misamis Oriental',
      contactPhone,
      operatingHours = 'Mon–Fri 8:00 AM – 5:00 PM',
      status = 'ACTIVE',
      isVerified = true,
      assignedDoctorId,
      scheduleDays,
      scheduleDay = 1,
      startTime = '08:00:00',
      endTime = '17:00:00',
      maxPatients = 40,
    } = body;

    if (!name?.trim() || !hospitalName?.trim() || !roomNumber?.trim()) {
      return NextResponse.json(
        { error: 'Clinic Name, Hospital Facility, and Room Number are required.' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Check for duplicate room in the same hospital
    const { data: existingRoom } = await supabase
      .from('clinics')
      .select('id, name, room_number')
      .eq('hospital_name', hospitalName.trim())
      .eq('room_number', roomNumber.trim())
      .maybeSingle();

    if (existingRoom) {
      return NextResponse.json(
        {
          error: `Room "${roomNumber.trim()}" is already registered under ${hospitalName.trim()} (${existingRoom.name}). Please specify a unique consultation room.`,
        },
        { status: 400 }
      );
    }

    // Insert Clinic Record
    const insertPayload: Record<string, any> = {
      name: name.trim(),
      hospital_name: hospitalName.trim(),
      hospital_id: hospitalId || null,
      building_name: buildingName?.trim() || null,
      floor_number: floorNumber?.trim() || null,
      room_number: roomNumber.trim(),
      address: address?.trim() || `${hospitalName.trim()}, Cagayan de Oro`,
      city: city.trim(),
      province: province.trim(),
      contact_phone: contactPhone?.trim() || null,
      operating_hours: operatingHours.trim(),
      status,
      is_verified: isVerified,
    };

    const { data: newClinic, error: clinicErr } = await supabase
      .from('clinics')
      .insert(insertPayload)
      .select()
      .single();

    if (clinicErr) {
      console.error('Error inserting clinic:', clinicErr);
      return NextResponse.json({ error: clinicErr.message }, { status: 500 });
    }

    // Optional: link assigned doctor schedules (multi-day support)
    if (assignedDoctorId && newClinic?.id) {
      const days = Array.isArray(scheduleDays) && scheduleDays.length > 0
        ? scheduleDays
        : [Number(scheduleDay) || 1];

      const rows = days.map((d) => ({
        doctor_id: assignedDoctorId,
        clinic_id: newClinic.id,
        day_of_week: Number(d),
        start_time: startTime || '08:30:00',
        end_time: endTime || '17:00:00',
        max_patients: Number(maxPatients) || 40,
        is_active: true,
      }));

      await supabase.from('doctor_clinic_schedules').insert(rows);
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      table_affected: 'clinics',
      record_id: newClinic.id,
      action: 'INSERT',
      old_data: null,
      new_data: insertPayload,
    });

    return NextResponse.json({ success: true, clinic: newClinic });
  } catch (err: any) {
    console.error('POST clinic error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 3. PUT: Update an existing clinic in Supabase
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      hospitalName,
      hospitalId,
      buildingName,
      floorNumber,
      roomNumber,
      address,
      city,
      province,
      contactPhone,
      operatingHours,
      status,
      isVerified,
      assignedDoctorId,
      scheduleDays,
      scheduleDay,
      startTime,
      endTime,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Clinic ID is required for update' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Fetch existing record
    const { data: oldClinic, error: fetchErr } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !oldClinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (hospitalName !== undefined) updatePayload.hospital_name = hospitalName.trim();
    if (hospitalId !== undefined) updatePayload.hospital_id = hospitalId;
    if (buildingName !== undefined) updatePayload.building_name = buildingName.trim();
    if (floorNumber !== undefined) updatePayload.floor_number = floorNumber.trim();
    if (roomNumber !== undefined) updatePayload.room_number = roomNumber.trim();
    if (address !== undefined) updatePayload.address = address.trim();
    if (city !== undefined) updatePayload.city = city.trim();
    if (province !== undefined) updatePayload.province = province.trim();
    if (contactPhone !== undefined) updatePayload.contact_phone = contactPhone.trim();
    if (operatingHours !== undefined) updatePayload.operating_hours = operatingHours.trim();
    if (status !== undefined) updatePayload.status = status;
    if (isVerified !== undefined) updatePayload.is_verified = isVerified;

    let updatedClinic = oldClinic;
    if (Object.keys(updatePayload).length > 0) {
      const { data, error: updateErr } = await supabase
        .from('clinics')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        console.error('Error updating clinic:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      updatedClinic = data;
    }

    // Optional: update, add, or remove doctor schedules (multi-day support)
    if (assignedDoctorId !== undefined) {
      // Clear existing schedules for this clinic
      await supabase
        .from('doctor_clinic_schedules')
        .delete()
        .eq('clinic_id', id);

      if (assignedDoctorId) {
        const days = Array.isArray(scheduleDays) && scheduleDays.length > 0
          ? scheduleDays
          : [Number(scheduleDay) || 1];

        const rows = days.map((d) => ({
          doctor_id: assignedDoctorId,
          clinic_id: id,
          day_of_week: Number(d),
          start_time: startTime || '08:30:00',
          end_time: endTime || '17:00:00',
          max_patients: 40,
          is_active: true,
        }));

        await supabase.from('doctor_clinic_schedules').insert(rows);
      }
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      table_affected: 'clinics',
      record_id: id,
      action: 'UPDATE',
      old_data: oldClinic,
      new_data: updatePayload,
    });

    return NextResponse.json({ success: true, clinic: updatedClinic });
  } catch (err: any) {
    console.error('PUT clinic error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// 4. DELETE: Safe removal / decommissioning of a clinic room
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Clinic ID is required for deletion' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 1. Data Integrity Guard: Check for active queue sessions
    const { data: activeSessions } = await supabase
      .from('queue_sessions')
      .select('id, session_date, current_serving_number')
      .eq('clinic_id', id)
      .eq('status', 'ACTIVE')
      .limit(1);

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot decommission clinic room: There is currently an active live queue session in progress. Please complete or pause the queue session before decommissioning.',
        },
        { status: 400 }
      );
    }

    // 2. Fetch clinic before deletion for audit log
    const { data: oldClinic } = await supabase
      .from('clinics')
      .select('id, name, hospital_name, room_number')
      .eq('id', id)
      .single();

    if (!oldClinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // 3. Delete clinic (cascades to doctor_clinic_schedules)
    const { error: deleteErr } = await supabase.from('clinics').delete().eq('id', id);

    if (deleteErr) {
      console.error('Error deleting clinic:', deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // 4. Write audit log
    await supabase.from('audit_logs').insert({
      table_affected: 'clinics',
      record_id: id,
      action: 'DELETE',
      old_data: oldClinic,
      new_data: null,
    });

    return NextResponse.json({ success: true, message: `Clinic suite ${oldClinic.room_number} decommissioned successfully.` });
  } catch (err: any) {
    console.error('DELETE clinic error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
