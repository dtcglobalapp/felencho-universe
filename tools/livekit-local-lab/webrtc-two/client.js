import { Room, RoomEvent, Track } from 'livekit-client';
const el=id=>document.getElementById(id);
let room=null, micOn=false;
const log=m=>{el('log').textContent+=new Date().toLocaleTimeString()+' '+m+'\n';};
function buttons(connected){el('joinA').disabled=connected;el('joinB').disabled=connected;el('mic').disabled=!connected;el('leave').disabled=!connected;}
async function join(role){
  buttons(true);el('status').textContent='Conectando '+role+'...';
  try{
    const response=await fetch('/token?role='+role);
    if(!response.ok)throw Error('Token HTTP '+response.status);
    const data=await response.json();room=new Room({adaptiveStream:true,dynacast:true});
    room.on(RoomEvent.ParticipantConnected,p=>log('Participante remoto conectado: '+p.identity));
    room.on(RoomEvent.ParticipantDisconnected,p=>log('Participante remoto salió: '+p.identity));
    room.on(RoomEvent.TrackSubscribed,(track,pub,p)=>{
      log('Pista recibida de '+p.identity+': '+track.kind);
      if(track.kind===Track.Kind.Audio){const node=track.attach();node.autoplay=true;node.controls=true;el('remote').appendChild(node);node.play().catch(()=>log('Audio bloqueado: pulsa reproducir en el control'));}
    });
    room.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(node=>node.remove()));
    room.on(RoomEvent.Disconnected,()=>{el('status').textContent='Desconectado';buttons(false);micOn=false;el('mic').textContent='Activar micrófono';log('Sala desconectada');});
    await room.connect(data.url,data.token);
    el('status').textContent='Conectado como '+role+' a '+data.room;
    log('WebRTC conectado. Personas remotas: '+room.remoteParticipants.size+'. Sin micro hasta activación manual.');
  }catch(e){log('ERROR: '+e.message);el('status').textContent='Error de conexión';room?.disconnect();room=null;buttons(false);}
}
el('joinA').onclick=()=>join('A');el('joinB').onclick=()=>join('B');
el('mic').onclick=async()=>{
  if(!room)return;
  try{await room.localParticipant.setMicrophoneEnabled(!micOn);micOn=!micOn;el('mic').textContent=micOn?'Silenciar micrófono':'Activar micrófono';log(micOn?'Micrófono publicando audio':'Micrófono silenciado');}
  catch(e){log('ERROR de micrófono: '+e.message);}
};
el('leave').onclick=()=>{room?.disconnect();room=null;el('remote').replaceChildren();};
