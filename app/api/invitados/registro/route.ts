import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RELEASE_VERSION = "felencho-mundial-guest-v1";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v: unknown, max = 1000) => typeof v === "string" ? v.trim().slice(0, max) : "";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = text(body.invitation_token, 256);
    const fullName = text(body.full_name, 160);
    const email = text(body.email, 254).toLowerCase();
    if (!token || !fullName || !emailPattern.test(email)) return NextResponse.json({error:"Completa tu invitación, nombre y correo."},{status:400});
    if (body.consent_publication !== true || body.consent_ai_interaction !== true) return NextResponse.json({error:"Se requiere autorización de participación y de interacción con IA."},{status:400});
    if (!["virtual","presencial"].includes(body.participation_mode)) return NextResponse.json({error:"Modalidad no válida."},{status:400});
    const {data:invite,error:inviteError} = await supabaseAdmin.from("podcast_guest_invitations").select("id,expires_at,used_at,invited_email").eq("token_hash",hashToken(token)).maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite || invite.used_at || new Date(invite.expires_at).getTime() < Date.now()) return NextResponse.json({error:"Invitación vencida o utilizada."},{status:403});
    if (invite.invited_email && invite.invited_email.toLowerCase() !== email) return NextResponse.json({error:"El correo no coincide con la invitación."},{status:403});
    const payload = {
      invitation_id:invite.id,full_name:fullName,email,artistic_name:text(body.artistic_name,160)||null,phone:text(body.phone,50)||null,
      language:text(body.language,12)||"es",participation_mode:body.participation_mode,
      interview_topic:text(body.interview_topic,1000)||null,biography:text(body.biography,2500)||null,
      music_titles:text(body.music_titles,2000)||null,music_permission_details:text(body.music_permission_details,3000)||null,
      social_instagram:text(body.social_instagram,300)||null,social_facebook:text(body.social_facebook,300)||null,
      social_youtube:text(body.social_youtube,300)||null,social_tiktok:text(body.social_tiktok,300)||null,
      social_website:text(body.social_website,300)||null,
      photo_storage_path:typeof body.photo_storage_path==="string" && body.photo_storage_path.startsWith(invite.id+"/") ? body.photo_storage_path : null,
      consent_photo_use:body.consent_photo_use===true,
      consent_release_version:RELEASE_VERSION,consent_publication:true,consent_ai_interaction:true,
      consent_ai_memory:body.consent_ai_memory===true,consent_community_contact:body.consent_community_contact===true,
      consent_music_use:body.consent_music_use===true,
    };
    const {error} = await supabaseAdmin.rpc("register_podcast_guest_atomic",{p_invitation_id:invite.id,p_payload:payload});
    if(error){
      if(error.code==="23505") return NextResponse.json({error:"Esta invitación ya fue registrada."},{status:409});
      throw error;
    }
    return NextResponse.json({ok:true,message:"Registro recibido. Pendiente de revisión por Felencho."});
  } catch (error) {
    console.error("[guest-registration] failed",error);
    return NextResponse.json({error:"No se pudo guardar el registro."},{status:500});
  }
}
