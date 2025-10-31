import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { email, password, name, position, level, contact, id_number, image_url, role, created_by } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUserEmail,
      password: temporaryPassword,
      user_metadata: { forcePasswordChange: true }
    });

    if (authError) throw authError;

    const auth_id = user.user.id;

    // Add to team table
    const { error: insertError } = await supabaseAdmin.from("team").insert([
      {
        auth_id,
        name,
        email,
        position: position || "",
        level: level || "",
        contact: contact || "",
        id_number: id_number || "",
        image_url: image_url || "",
        role: role || "Member",
        created_by: created_by || "System",
      },
    ]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: "✅ User created successfully", auth_id });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
