#!/usr/bin/env python3
"""Conservative one-step local patch for Bob's provisional Dylan voice."""
from pathlib import Path
import re
import shutil
import sys
from datetime import datetime

ROOT = Path.home() / "Documents" / "felencho-realtime-lab"
EXT = {".tsx", ".ts", ".jsx", ".js", ".mjs"}
SKIP = {"node_modules", ".next", ".git", "dist", "build", ".turbo"}
RULES = [
    ("label", r"Bob\s*[·–-]\s*Ryan", "Bob · Dylan"),
    ("label", r"Ryan\s*\(Bob\)", "Dylan (Bob)"),
    ("label", r"Bob\s*\(Ryan\)", "Bob (Dylan)"),
    ("label", r"Ryan para Bob", "Dylan para Bob"),
    ("label", r"Voz de Bob fijada en\s*<strong>Ryan</strong>", "Voz de Bob fijada en <strong>Dylan</strong>"),
    ("voice", r"(\b(?:const|let|var)\s+bobVoice\s*=\s*['\"])Ryan(['\"])", r"\g<1>Dylan\2"),
    ("voice", r"(\b(?:const|let|var)\s+bob_voice\s*=\s*['\"])Ryan(['\"])", r"\g<1>Dylan\2"),
    ("voice", r"(\bbob_voice\s*:\s*['\"])Ryan(['\"])", r"\g<1>Dylan\2"),
    ("voice", r"(\bbobVoice\s*:\s*['\"])Ryan(['\"])", r"\g<1>Dylan\2"),
]
def main():
    if not ROOT.is_dir():
        print("SIN CAMBIOS: no existe la carpeta Realtime Lab esperada.")
        return 1
    files = []
    for sub in ("app", "src", "pages", "tools"):
        folder = ROOT / sub
        if folder.is_dir():
            files.extend(p for p in folder.rglob("*") if p.is_file() and not p.is_symlink()
                         and p.suffix in EXT and not any(part in SKIP for part in p.relative_to(ROOT).parts)
                         and ".backup" not in p.name)
    proposals = []
    counts = {"label": 0, "voice": 0}
    existing = {"label": False, "voice": False}
    candidates = []
    for p in files:
        try:
            src = p.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        if re.search(r"Bob\s*[·–-]\s*Dylan|Dylan\s*\(Bob\)", src):
            existing["label"] = True
        if re.search(r"\bbob(?:Voice|_voice)\s*[:=]\s*['\"]Dylan['\"]", src):
            existing["voice"] = True
        dst = src
        for kind, pattern, replacement in RULES:
            dst, n = re.subn(pattern, replacement, dst)
            counts[kind] += n
        if dst != src:
            proposals.append((p, src, dst))
        if "Ryan" in src and ("Bob" in src or "bob" in src):
            candidates.append(str(p.relative_to(ROOT)))
    if not proposals:
        print("SIN CAMBIOS: no se encontraron asociaciones Bob/Ryan reconocidas.")
        print("Archivos a revisar (sin mostrar contenido):", *sorted(set(candidates))[:12], sep="\n  ")
        return 2
    if not (counts["label"] or existing["label"]) or not (counts["voice"] or existing["voice"]):
        print("SIN CAMBIOS: no pude verificar simultaneamente el rotulo y la voz.")
        print("Encontrados:", counts, "| Configuraciones Dylan existentes:", existing)
        print("Archivos candidatos:", *sorted(set(candidates))[:12], sep="\n  ")
        return 3
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backups = []
    try:
        for path, before, after in proposals:
            backup = path.with_name(path.name + ".backup-" + stamp)
            shutil.copy2(path, backup)
            backups.append((path, backup))
        for path, before, after in proposals:
            path.write_text(after, encoding="utf-8")
    except Exception as exc:
        for original, backup in backups:
            shutil.copy2(backup, original)
        print("ERROR: se intento restaurar desde las copias originales:", exc)
        return 4
    print("BOB = DYLAN: CAMBIO INSTALADO EN LOS ARCHIVOS")
    for path, _, _ in proposals:
        print("  " + str(path.relative_to(ROOT)))
    print("No se apagaron servicios. Conserva los respaldos con sufijo .backup-" + stamp)
    print("Actualiza Realtime Lab en Chrome (Cmd+Shift+R).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
