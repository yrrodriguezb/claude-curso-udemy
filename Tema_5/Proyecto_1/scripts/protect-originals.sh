#!/bin/bash
# Protege las imágenes originales de input/: bloquea copiarlas, moverlas, renombrarlas,
# borrarlas o sobrescribirlas desde Bash o PowerShell. Leer o listar sigue permitido.
# Claude Code envía el evento como JSON por stdin; el comando está en tool_input.command
cmd=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input?.command??"")}catch{}})')

# ¿El comando hace referencia a la carpeta input? (input/, input\, "input" como argumento)
refs_input='(^|[[:space:]"'"'"'=(./\\])input([/\\]|[[:space:]"'"'"';|&)]|$)'

# Verbos que copian, mueven, borran o escriben
verbs='(^|[;&|({[:space:]])(cp|copy|copy-item|cpi|xcopy|robocopy|rsync|scp|install|ln|tar|zip|7z|compress-archive|mv|move|move-item|mi|rename|ren|rename-item|rni|rm|rmdir|del|erase|rd|remove-item|ri|set-content|add-content|clear-content|out-file|tee|truncate|dd|sed[[:space:]]+-i)([[:space:]]|$)'

if echo "$cmd" | grep -qiE "$refs_input" && echo "$cmd" | grep -qiE "$verbs|>"; then
  echo "Bloqueado por protect-originals: no se permite copiar, mover, borrar ni modificar las imágenes originales de input/" >&2
  exit 2
fi
exit 0
