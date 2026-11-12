import { Room, RoomEvent, Track } from 'livekit-client';
const el=id=>document.getElementById(id);
let room=null, micOn=false, playing=false, audioContext=null, activeSource=null, publishedTrack=null;
const log=m=>{el('log').textContent+=new Date().toLocaleTimeString()+' '+m+'\n';};
function buttons(connected){
  el('joinA').disabled=connected;el('joinB').disabled=connected;
  el('mic').disabled=!connected || playing;el('play').disabled=!connected || playing;el('playBob').disabled=!connected || playing;
  el('freshLina').disabled=!connected || playing;el('freshBob').disabled=!connected || playing;
  el('leave').disabled=!connected;
}
async function stopPlayback(){
  if(activeSource){try{activeSource.stop();}catch{} activeSource=null;}
  if(publishedTrack && room){try{await room.localParticipant.unpublishTrack(publishedTrack);}catch{}}
  publishedTrack=null;
  if(audioContext){try{await audioContext.close();}catch{}audioContext=null;}
  playing=false;buttons(Boolean(room && room.state==='connected'));
}
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
    room.on(RoomEvent.Disconnected,()=>{
      el('status').textContent='Desconectado';buttons(false);micOn=false;
      el('mic').textContent='Activar micrófono';log('Sala desconectada');
      void stopPlayback();
    });
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
async function transmitVoice(voice,fresh=false){
  if(!room || playing)return;
  playing=true;buttons(true);
  try{
    const response=await fetch(fresh?(voice==='bob'?'/fresh-bob.wav':'/fresh-lina.wav'):(voice==='bob'?'/bob.wav':'/serena.wav'),{cache:'no-store'});
    if(!response.ok)throw Error('WAV HTTP '+response.status+': '+await response.text());
    const data=await response.arrayBuffer();
    audioContext=new AudioContext();
    await audioContext.resume();
    const decoded=await audioContext.decodeAudioData(data);
    const destination=audioContext.createMediaStreamDestination();
    const source=audioContext.createBufferSource();activeSource=source;
    source.buffer=decoded;source.connect(destination);
    publishedTrack=destination.stream.getAudioTracks()[0];
    await room.localParticipant.publishTrack(publishedTrack,{name:voice+(fresh?'-fresh':'-sample')+'-qwen-local-wav',source:Track.Source.Microphone});
    log('WAV '+(voice==='bob'?'Bob':'Serena')+' publicado. Duración: '+decoded.duration.toFixed(2)+' segundos');
    source.onended=()=>{log('WAV '+(voice==='bob'?'Bob':'Serena')+' terminado');void stopPlayback();};
    source.start();
  }catch(e){log('ERROR de WAV: '+e.message);await stopPlayback();}
}
el('play').onclick=()=>transmitVoice('serena');
el('playBob').onclick=()=>transmitVoice('bob');
el('freshLina').onclick=()=>transmitVoice('serena',true);
el('freshBob').onclick=()=>transmitVoice('bob',true);
el('leave').onclick=async()=>{await stopPlayback();room?.disconnect();room=null;el('remote').replaceChildren();};
