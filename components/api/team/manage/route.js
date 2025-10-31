import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      role,
      email,
      password,
      id_number,
      contact,
      image_url,
      level,
      position,
      parent_id,
      created_by,
    } = body;

    // 🟩 1️⃣ EDIT USER
    if (id) {
      // Check if another user has the same email (to prevent accidental duplicate)
      const { data: existingEmail, error: emailCheckError } = await supabaseAdmin
        .from("team")
        .select("id")
        .eq("email", email)
        .neq("id", id)
        .maybeSingle();

      if (emailCheckError) throw emailCheckError;
      if (existingEmail)
        return NextResponse.json(
          { error: "Another user already uses this email" },
          { status: 400 }
        );

      const { error: updateError } = await supabaseAdmin
        .from("team")
        .update({
          name,
          role,
          email,
          id_number,
          contact,
          image_url,
          level,
          position,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      return NextResponse.json({ message: "✅ User updated successfully" });
    }

    // 🟦 2️⃣ ADD USER
    // Check if email already exists in your team table
    const { data: existingTeamUser, error: teamCheckError } = await supabaseAdmin
      .from("team")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (teamCheckError) throw teamCheckError;
    if (existingTeamUser)
      return NextResponse.json(
        { error: "A user with this email address has already been registered" },
        { status: 400 }
      );

    // Create new auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) throw authError;

    const auth_id = authData.user.id;
    const newId = uuidv4();

    const { error: insertError } = await supabaseAdmin.from("team").insert([
      {
        id: newId,
        auth_id,
        name,
        role,
        email,
        id_number,
        contact,
        image_url,
        level,
        position,
        parent_id,
        created_by,
      },
    ]);

    if (insertError) throw insertError;

    return NextResponse.json({
      message: "✅ New user added successfully",
    });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id, auth_id } = body;

    if (!id) throw new Error("Missing user id");

    if (auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(auth_id);
    }

    const { error } = await supabaseAdmin.from("team").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "✅ User deleted successfully" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
