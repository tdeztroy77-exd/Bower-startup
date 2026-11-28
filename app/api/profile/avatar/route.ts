import { NextResponse } from "next/server"
import { withAuth, dbError, errorResponse } from "@/lib/api"
import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"

/**
 * POST /api/profile/avatar
 *
 * Uploads a profile photo and writes it to the profile.
 *
 * The image goes into the public `avatars` bucket under the caller's
 * own folder (`avatars/{userId}/…`), which is what the storage policies
 * enforce: you may only ever write inside your own folder.
 *
 * Body: multipart/form-data with a `file` field.
 */

const MAX_BYTES = 4 * 1024 * 1024

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export const POST = withAuth(async (request, { supabase, userId }) => {
  try {
    const form = await request.formData().catch(() => null)
    const file = form?.get("file")

    if (!file || typeof file === "string") {
      return errorResponse("Choose an image to upload", 400)
    }

    const blob = file as File
    const extension = ALLOWED[blob.type]

    if (!extension) {
      return errorResponse("Use a JPG, PNG, WebP or GIF image", 415)
    }
    if (blob.size > MAX_BYTES) {
      return errorResponse("That image is larger than 4MB", 413)
    }

    const path = `${userId}/${Date.now()}-profile.${extension}`
    const bytes = new Uint8Array(await blob.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: blob.type, upsert: true })

    if (uploadError) {
      return dbError("app/api/profile/avatar/route.ts", uploadError, 500)
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    const avatarUrl = data.publicUrl

    // Keep both records in step, exactly like the text fields.
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", userId)

    if (profileError) {
      return dbError("app/api/profile/avatar/route.ts", profileError, 500)
    }

    const service = createServiceClient()
    if (service) {
      await service
        .from("team_members")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", userId)
    }

    return NextResponse.json({ ok: true, avatar_url: avatarUrl })
  } catch (e) {
    return dbError("app/api/profile/avatar/route.ts", e, 500)
  }
})
