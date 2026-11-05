"""Opt-in public research adapters for Felencho Mundial (experimental).

Live network requests ONLY when run_live() is explicitly called. No secrets,
models, scraping, private libraries or production wiring. Fixed API endpoints:
Open Library for catalog records and Crossref for scholarly bibliographic
metadata. These are discovery sources, NOT proof of current news or facts.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError

from research_evidence_offline import Evidence, evidence_pack

MAX_RESPONSE = 90_000
MAX_QUERY = 180

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def _json_get(endpoint: str, params: dict, *, transport=None) -> dict:
    """Allow only fixed HTTPS origins; bounded read; redirect forbidden."""
    if endpoint not in ("https://openlibrary.org/search.json",
                        "https://api.crossref.org/works"):
        raise ValueError("endpoint_not_allowed")
    url = endpoint + "?" + urlencode(params)
    if transport is None:
        opener = build_opener(NoRedirect())
        def transport(url):
            with opener.open(Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "FelenchoMundialResearchPrototype/0.1 (bibliographic lookup)"
            }), timeout=4) as response:
                payload = response.read(MAX_RESPONSE + 1)
                if len(payload) > MAX_RESPONSE:
                    raise ValueError("response_too_large")
                return payload
    raw = transport(url)
    if type(raw) is not bytes or len(raw) > MAX_RESPONSE:
        raise ValueError("invalid_response")
    data = json.loads(raw)
    if type(data) is not dict:
        raise ValueError("invalid_payload")
    return data

def _query(q: str) -> str:
    if type(q) is not str or not 2 <= len(q.strip()) <= MAX_QUERY:
        raise ValueError("invalid_query")
    return q.strip()

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def open_library(query: str, *, transport=None) -> list[Evidence]:
    data = _json_get("https://openlibrary.org/search.json", {
        "q": _query(query), "limit": 3, "fields": "key,title,author_name,first_publish_year"
    }, transport=transport)
    results = []
    for doc in data.get("docs", [])[:3]:
        if not isinstance(doc, dict) or not isinstance(doc.get("key"), str):
            continue
        key = doc["key"]
        # Strict catalog key prevents returned data from changing destination origin.
        if not key.startswith("/works/") or not key[7:].replace("/", "").isalnum():
            continue
        title = str(doc.get("title", "")).strip()[:200]
        authors = doc.get("author_name") or []
        author = ", ".join(str(a) for a in authors[:2])[:120] if isinstance(authors, list) else None
        if not title:
            continue
        year = doc.get("first_publish_year")
        excerpt = "Registro bibliográfico del catálogo Open Library"
        if isinstance(year, int) and 1000 <= year <= 2100:
            excerpt += f"; primera publicación aproximada: {year}"
        results.append(Evidence(title=title, url="https://openlibrary.org" + key,
                                kind="library", excerpt=excerpt,
                                retrieved_at=_now(), author=author, verified=False))
    return results

def crossref(query: str, *, transport=None) -> list[Evidence]:
    data = _json_get("https://api.crossref.org/works", {
        "query.bibliographic": _query(query), "rows": 3,
        "select": "DOI,title,published,author"
    }, transport=transport)
    message = data.get("message") or {}
    results = []
    for doc in message.get("items", [])[:3]:
        if not isinstance(doc, dict):
            continue
        doi = doc.get("DOI")
        titles = doc.get("title") or []
        if not isinstance(doi, str) or not isinstance(titles, list) or not titles:
            continue
        # DOI allowed chars are deliberately narrow for untrusted URL creation.
        if not doi.startswith("10.") or not all(c.isascii() and (c.isalnum() or c in "._-/()") for c in doi):
            continue
        title = str(titles[0]).strip()[:200]
        if not title:
            continue
        results.append(Evidence(title=title, url="https://doi.org/" + doi,
                                kind="academic",
                                excerpt="Referencia bibliográfica Crossref; contenido íntegro no verificado",
                                retrieved_at=_now(), verified=False))
    return results

def run_live(query: str, *, sources=("openlibrary", "crossref"), transport=None) -> dict:
    """Explicit invocation only. Provider errors are described, not guessed."""
    _query(query)
    if not isinstance(sources, (tuple, list)) or any(x not in ("openlibrary", "crossref") for x in sources):
        raise ValueError("unsupported_provider")
    found, errors = [], []
    for name in dict.fromkeys(sources):
        try:
            found.extend((open_library if name == "openlibrary" else crossref)(
                query, transport=transport
            ))
        except (ValueError, HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            errors.append({"provider": name, "error": type(exc).__name__})
    pack = evidence_pack(query, found[:8])
    pack["providers_attempted"] = list(dict.fromkeys(sources))
    pack["provider_errors"] = errors
    pack["live_network_attempted"] = transport is None
    pack["scope"] = "bibliographic_discovery_only_not_general_web_search"
    return pack
