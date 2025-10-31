import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, name, email, role, id_number, contact, image_url, level = 99, position = 999 } = body;

    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    // Update team row
    const { error: updateError } = await supabaseAdmin
      .from("team")
      .update({ name, email, role, id_number, contact, image_url, level, position })
      .eq("id", id);

    if (updateError) {
      console.error("updateError", updateError);
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    // If email changed, also update auth user email
    // Note: Supabase admin.users.update requires the user id; we've stored id in team table
    const { data: userRow } = await supabaseAdmin
      .from("team")
      .select("id")
      .eq("id", id)
      .single();

    if (userRow?.id) {
      // update auth user email
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
      });
      if (authError) {
        console.error("auth update error", authError);
        // not fatal for team update
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: e.message || "Server error" }, { status: 500 });
  }
}
