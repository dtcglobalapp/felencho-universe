#!/usr/bin/env python3
"""Offline validation of exported Bob/Lina GLB assets. Standard library only.

Structural acceptance is NOT visual identity acceptance; comparison to the
approved studio reference requires rendering and human review.
"""
import argparse
import json
from pathlib import Path
import struct
import sys

SUPPORTED = {
    "visemeaa", "visemea", "jawopen", "mouthopen", "visemee", "visemeee",
    "visemeih", "visemei", "visemeo", "visemeoh", "mouthfunnel",
    "visemeu", "visemeou", "mouthpucker", "visemem", "visemepp",
    "mouthclose", "visemef", "visemeff", "visemel", "visemess", "visemes"
}

def normalize(value):
    return "".join(c for c in str(value).lower() if c.isalnum())

def inspect_glb(filename):
    raw = Path(filename).read_bytes()
    if len(raw) < 20 or raw[:4] != b"glTF":
        raise ValueError("Not a GLB file")
    version, expected_length = struct.unpack_from("<II", raw, 4)
    if version != 2 or expected_length != len(raw):
        raise ValueError("GLB version/length mismatch")
    offset, doc = 12, None
    while offset + 8 <= len(raw):
        length, kind = struct.unpack_from("<II", raw, offset)
        offset += 8
        if length % 4 != 0 or length < 0 or offset + length > len(raw):
            raise ValueError("Invalid GLB chunk length")
        if kind == 0x4E4F534A and doc is None:
            doc = json.loads(raw[offset:offset + length].decode("utf-8").rstrip(" \x00"))
        offset += length
    if offset != len(raw) or not isinstance(doc, dict):
        raise ValueError("Malformed GLB chunks or missing JSON")
    meshes = doc.get("meshes", [])
    if not isinstance(meshes, list):
        raise ValueError("Malformed meshes")
    primitive_count = sum(len(mesh.get("primitives", [])) for mesh in meshes)
    morph_names = []
    for mesh in meshes:
        names = mesh.get("extras", {}).get("targetNames", [])
        if isinstance(names, list):
            morph_names.extend(names)
    jaws = [
        node.get("name", "") for node in doc.get("nodes", [])
        if "jaw" in node.get("name", "").lower() or "mandib" in node.get("name", "").lower()
    ]
    compatible = sorted({name for name in morph_names if normalize(name) in SUPPORTED})
    return {
        "filename": Path(filename).name,
        "geometry_primitives": primitive_count,
        "meshes": len(meshes),
        "materials": len(doc.get("materials", [])),
        "skins": len(doc.get("skins", [])),
        "recognized_viseme_morphs": compatible,
        "jaw_nodes": jaws,
        "geometry_gate": primitive_count > 0,
        "facial_rig_gate": bool(compatible or jaws),
        "face_identity_reviewed": False,
        "webgl_render_reviewed": False,
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()
    valid = True
    for path in args.paths:
        try:
            result = inspect_glb(path)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            valid &= result["geometry_gate"] and result["facial_rig_gate"]
        except (OSError, ValueError, TypeError, KeyError) as exc:
            print(json.dumps({"filename": path, "error": str(exc)}))
            valid = False
    return 0 if valid else 1

if __name__ == "__main__":
    sys.exit(main())
