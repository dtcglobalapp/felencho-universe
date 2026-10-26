import { NextResponse } from "next/server";
import { checkStudioPassword, issueStudioCookie, STUDIO_COOKIE_NAME } from "@/lib/studioGuestAuth";
export const runtime="nodejs";
export async function POST(request:Request){
 const body=await request.json().catch(()=>({}));
 if(!checkStudioPassword(typeof body.password==="string"?body.password:""))return NextResponse.json({error:"Acceso no autorizado"},{status:403});
 const response=NextResponse.json({ok:true});
 response.cookies.set(STUDIO_COOKIE_NAME,issueStudioCookie(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:14400});
 return response;
}
export async function DELETE(){const response=NextResponse.json({ok:true});response.cookies.set(STUDIO_COOKIE_NAME,"",{httpOnly:true,path:"/",maxAge:0});return response;}
