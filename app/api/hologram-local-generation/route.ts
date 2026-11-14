import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Changes whenever Next.js starts again, even if the Studio Control panel is
// already running an old version and has not yet written its restart marker.
const serverInstance=String(process.pid)+'-'+String(Date.now());
const versionFile=join(homedir(),'Library','Logs','FelenchoStudioLab','display-generation.json');

export async function GET(request:NextRequest) {
  const host=request.headers.get('host')||'';
  if(process.env.NODE_ENV!=='development' ||
     !['localhost:3001','127.0.0.1:3001'].includes(host)) {
    return NextResponse.json({error:'Solo laboratorio local'},{status:403});
  }
  let studioGeneration='';
  try {
    const marker=JSON.parse(await readFile(versionFile,'utf8')) as {generation?:unknown};
    if(typeof marker.generation==='string' && marker.generation.length<128)
      studioGeneration=marker.generation;
  } catch {
    // Studio Control may not have generated its marker yet.
  }
  return NextResponse.json(
    {generation:serverInstance+':'+studioGeneration},
    {headers:{'Cache-Control':'no-store, no-cache, must-revalidate','Pragma':'no-cache'}}
  );
}
