import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// 🟢 GET all users
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("team")
      .select("*")
      .order("level", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🟠 POST = Update
export async function POST(request) {
  try {
    const body = await request.json();
    const { auth_id, name, position, level, contact, id_number, image_url, email } = body;

    if (!auth_id) return NextResponse.json({ error: "Missing auth_id" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("team")
      .update({
        name,
        position,
        level,
        contact,
        id_number,
        image_url,
        email,
      })
      .eq("auth_id", auth_id);

    if (error) throw error;

    return NextResponse.json({ message: "✅ User updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔴 DELETE = Remove user from Auth + team
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const auth_id = searchParams.get("auth_id");

    if (!auth_id) return NextResponse.json({ error: "Missing auth_id" }, { status: 400 });

    await supabaseAdmin.from("team").delete().eq("auth_id", auth_id);
    await supabaseAdmin.auth.admin.deleteUser(auth_id);

    return NextResponse.json({ message: "✅ User deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
