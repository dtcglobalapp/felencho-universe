import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret=process.env.STUDIO_INVITATION_ADMIN_SECRET;
  const authorization=request.headers.get("authorization");
  if(!secret || authorization!== "Bearer "+secret) return NextResponse.json({error:"No autorizado."},{status:403});
  try{
    const body=await request.json();
    const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"Correo no válido."},{status:400});
    const token=randomBytes(32).toString("base64url");
    const hash=createHash("sha256").update(token).digest("hex");
    const expires_at=new Date(Date.now()+7*86400000).toISOString();
    const {error}=await supabaseAdmin.from("podcast_guest_invitations").insert({token_hash:hash,invited_email:email,expires_at});
    if(error)throw error;
    const url=new URL("/invitados/registro",request.url);
    url.searchParams.set("token",token);
    return NextResponse.json({ok:true,invite_url:url.toString(),email,expires_at});
  }catch(error){console.error("[guest invite]",error);return NextResponse.json({error:"No se pudo crear la invitación."},{status:500});}
}
