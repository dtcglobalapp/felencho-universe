-- Felencho Mundial Studio Lab - click-to-open Mac launcher.
-- Compiled on Mac with osacompile; no Terminal window opens when launched.
on run
  set homePath to POSIX path of (path to home folder)
  set repoPath to homePath & "Documents/felencho-hologram-visual-test"
  set nodePath to "/opt/homebrew/bin/node"
  set appScript to repoPath & "/tools/studio-local-lab/studio-control.mjs"
  set logPath to homePath & "Library/Logs/FelenchoStudioLab"
  set started to false
  try
    do shell script "/usr/bin/test -f " & quoted form of appScript & " && /usr/bin/test -x " & quoted form of nodePath
  on error
    display dialog "No encuentro el laboratorio o Node.js. Verifica la carpeta felencho-hologram-visual-test y Homebrew." buttons {"Aceptar"} default button 1
    return
  end try
  try
    do shell script "/bin/mkdir -p " & quoted form of logPath
    do shell script "/usr/bin/curl -fsS --max-time 1 http://127.0.0.1:7892/api/status >/dev/null 2>&1"
  on error
    do shell script "/usr/bin/nohup " & quoted form of nodePath & " " & quoted form of appScript & " >> " & quoted form of (logPath & "/launcher.log") & " 2>&1 < /dev/null &"
    set started to true
  end try
  if started then
    repeat 15 times
      delay 0.3
      try
        do shell script "/usr/bin/curl -fsS --max-time 1 http://127.0.0.1:7892/api/status >/dev/null 2>&1"
        exit repeat
      end try
    end repeat
  end if
  open location "http://127.0.0.1:7892"
end run
