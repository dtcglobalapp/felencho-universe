-- Felencho Mundial Studio Lab. Double click; no Terminal window.
on run
  set homePath to POSIX path of (path to home folder)
  set repoPath to homePath & "Documents/felencho-hologram-visual-test"
  set nodePath to "/opt/homebrew/bin/node"
  set appScript to repoPath & "/tools/studio-local-lab/studio-control.mjs"
  set logDir to homePath & "Library/Logs/FelenchoStudioLab"
  set logFile to logDir & "/launcher.log"
  set healthCommand to "/usr/bin/curl -fsS --max-time 2 http://127.0.0.1:7892/api/status >/dev/null 2>&1"
  try
    do shell script "/usr/bin/test -f " & quoted form of appScript & " && /usr/bin/test -x " & quoted form of nodePath
    do shell script "/bin/mkdir -p " & quoted form of logDir
  on error errMsg
    display dialog "Felencho Studio no encuentra sus archivos. " & errMsg buttons {"Aceptar"} default button 1
    return
  end try
  set ready to false
  try
    do shell script healthCommand
    set ready to true
  end try
  if not ready then
    try
      -- Explicit subshell detaches Node and redirects all output to its own log.
      -- Launch attempts are logged before spawning so failures can be diagnosed.
      do shell script "/bin/echo 'Launching Felencho Studio Lab' >> " & quoted form of logFile
      set launchLine to "/usr/bin/nohup " & quoted form of nodePath & " " & quoted form of appScript & " >> " & quoted form of logFile & " 2>&1 </dev/null &"
      do shell script "/bin/sh -c " & quoted form of launchLine
    on error errMsg
      display dialog "No pude iniciar Felencho Studio. " & errMsg & return & "Registro: " & logFile buttons {"Aceptar"} default button 1
      return
    end try
    repeat 20 times
      delay 0.5
      try
        do shell script healthCommand
        set ready to true
        exit repeat
      end try
    end repeat
  end if
  if ready then
    open location "http://127.0.0.1:7892"
  else
    display dialog "El panel no inicio en el puerto 7892. No abrire una pagina vacia. Revisa: " & logFile buttons {"Aceptar"} default button 1
  end if
end run
