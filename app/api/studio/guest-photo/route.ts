import { NextResponse } from "next/server";
import { isStudioAuthorized } from "@/lib/studioGuestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime="nodejs";
export async function GET(request:Request){
 if(!isStudioAuthorized(request))return NextResponse.json({error:"Acceso restringido"},{status:403});
 const id=new URL(request.url).searchParams.get("id")||"";
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))return NextResponse.json({error:"Invitado inválido"},{status:400});
 const {data,error}=await supabaseAdmin.from("podcast_guest_registrations")
 .select("photo_storage_path,consent_photo_use").eq("id",id).eq("status","approved").eq("consent_ai_memory",true).maybeSingle();
 if(error)return NextResponse.json({error:"Error de consulta"},{status:500});
 if(!data||!data.consent_photo_use||!data.photo_storage_path)return NextResponse.json({error:"Fotografía no autorizada o inexistente"},{status:404});
 const {data:file,error:downloadError}=await supabaseAdmin.storage.from("podcast-guest-photos").download(data.photo_storage_path);
 if(downloadError||!file)return NextResponse.json({error:"No se pudo cargar fotografía"},{status:404});
 return new NextResponse(file.stream(),{headers:{"Content-Type":file.type||"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
