import { createHmac, timingSafeEqual } from "node:crypto";
const COOKIE = "felencho_studio_auth";
function secret(){return process.env.STUDIO_INVITATION_ADMIN_SECRET || "";}
function mac(value:string){return createHmac("sha256",secret()).update(value).digest("hex");}
export function issueStudioCookie(){const expiry=Date.now()+4*60*60*1000;const payload=String(expiry);return payload+"."+mac(payload);}
export function isStudioAuthorized(request:Request){const key=secret();if(!key)return false;const raw=request.headers.get("cookie")||"";const match=raw.match(/(?:^|;\s*)felencho_studio_auth=([^;]+)/);if(!match)return false;const [expiry,signature]=decodeURIComponent(match[1]).split(".");if(!expiry||!signature||!/^[0-9a-f]{64}$/.test(signature)||Number(expiry)<Date.now()||Number(expiry)>Date.now()+4*60*60*1000)return false;return timingSafeEqual(Buffer.from(mac(expiry),"hex"),Buffer.from(signature,"hex"));}
export function checkStudioPassword(password:string){const key=secret();if(!key||!password)return false;const a=Buffer.from(password),b=Buffer.from(key);return a.length===b.length&&timingSafeEqual(a,b);}
export const STUDIO_COOKIE_NAME=COOKIE;
