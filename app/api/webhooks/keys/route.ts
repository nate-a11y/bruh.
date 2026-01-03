import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/webhooks";

// GET /api/webhooks/keys - List API keys
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: keys } = await supabase
      .from("zeroed_api_keys")
      .select("id, name, key_prefix, last_used_at, expires_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ keys: keys || [] });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/webhooks/keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, expires_in_days } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate the key
    const { key, hash, prefix } = generateApiKey();

    // Calculate expiration
    let expiresAt = null;
    if (expires_in_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expires_in_days);
      expiresAt = expiry.toISOString();
    }

    // Store the key (only the hash)
    const { data, error } = await supabase
      .from("zeroed_api_keys")
      .insert({
        user_id: user.id,
        name,
        key_hash: hash,
        key_prefix: prefix,
        expires_at: expiresAt,
      })
      .select("id, name, key_prefix, expires_at, created_at")
      .single();

    if (error) {
      console.error("Error creating API key:", error);
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Return the full key ONLY on creation (won't be stored or retrievable later)
    return NextResponse.json({
      key: {
        ...data,
        secret: key, // This is the only time the full key is shown
      },
      warning: "Save this key now - you won't be able to see it again!",
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/webhooks/keys - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("zeroed_api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
