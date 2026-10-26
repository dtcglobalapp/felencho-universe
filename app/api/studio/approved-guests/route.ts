import { NextResponse } from "next/server";
import { isStudioAuthorized } from "@/lib/studioGuestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime="nodejs";
export async function GET(request:Request){
 if(!isStudioAuthorized(request))return NextResponse.json({error:"Acceso restringido"},{status:403});
 const {data,error}=await supabaseAdmin.from("podcast_guest_registrations")
 .select("id,full_name,artistic_name,interview_topic").eq("status","approved").eq("consent_ai_memory",true).order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:"No se pudieron cargar invitados"},{status:500});
 return NextResponse.json({guests:data||[]},{headers:{"Cache-Control":"no-store"}});
}
