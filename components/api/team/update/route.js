import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, role, position, level, contact, id_number, image_url, email } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user ID for update" }, { status: 400 });
    }

    console.log("🛠 Updating team row by ID:", id);

    const { data, error } = await supabaseAdmin
      .from("team")
      .update({
        name,
        role,
        position,
        level,
        contact,
        id_number,
        image_url,
        email,
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No record found with that ID" }, { status: 404 });
    }

    console.log("✅ Update successful:", data);
    return NextResponse.json({ message: "✅ User updated successfully!", data });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
