import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { id, auth_id } = await req.json();

    if (!id || !auth_id) {
      return NextResponse.json({ error: "Missing id or auth_id" }, { status: 400 });
    }

    // Validate UUID
    if (!/^[0-9a-fA-F-]{36}$/.test(auth_id)) {
      return NextResponse.json({ error: "Invalid auth_id UUID" }, { status: 400 });
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
    if (authError) throw authError;

    // Delete from team table
    const { error: dbError } = await supabaseAdmin.from("team").delete().eq("id", id);
    if (dbError) throw dbError;

    return NextResponse.json({ message: "✅ User deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
