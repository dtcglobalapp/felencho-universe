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
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpg = bytes.length>3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const png = bytes.length>8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
    const webp = bytes.length>12 && new TextDecoder().decode(bytes.slice(0,4))==="RIFF" && new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
    if (!(file.type==="image/jpeg"&&jpg || file.type==="image/png"&&png || file.type==="image/webp"&&webp)) return NextResponse.json({error:"El contenido del archivo no corresponde a una imagen válida."},{status:400});
    const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
    const path=invite.id+"/"+randomBytes(12).toString("hex")+"."+ext;
    const {error}=await supabaseAdmin.storage.from("podcast-guest-photos").upload(path,bytes,{contentType:file.type,upsert:false});
    if(error) throw error;
    return NextResponse.json({ok:true,photo_storage_path:path});
  }catch(error){console.error("[guest photo]",error);return NextResponse.json({error:"No se pudo guardar la fotografía."},{status:500});}
}
