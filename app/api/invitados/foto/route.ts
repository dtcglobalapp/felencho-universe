import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("invitation_token")||"");
    const file = form.get("photo");
    if (token.length<20 || !(file instanceof File)) return NextResponse.json({error:"Invitación y fotografía requeridas."},{status:400});
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024||file.size===0) return NextResponse.json({error:"Usa una imagen JPG, PNG o WebP de hasta 5 MB."},{status:400});
    const tokenHash=createHash("sha256").update(token).digest("hex");
    const {data:invite,error:inviteError}=await supabaseAdmin.from("podcast_guest_invitations").select("id,expires_at,used_at").eq("token_hash",tokenHash).maybeSingle();
    if(inviteError) throw inviteError;
    if(!invite||invite.used_at||new Date(invite.expires_at).getTime()<Date.now())return NextResponse.json({error:"Invitación inválida o vencida."},{status:403});
    const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
    const path=invite.id+"/"+randomBytes(12).toString("hex")+"."+ext;
    const {error}=await supabaseAdmin.storage.from("podcast-guest-photos").upload(path,file,{contentType:file.type,upsert:false});
    if(error) throw error;
    return NextResponse.json({ok:true,photo_storage_path:path});
  }catch(error){console.error("[guest photo]",error);return NextResponse.json({error:"No se pudo guardar la fotografía."},{status:500});}
}
