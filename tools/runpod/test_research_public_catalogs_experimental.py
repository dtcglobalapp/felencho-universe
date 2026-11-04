"""Fully mocked catalog adapter tests; no web traffic or credentials."""
import json
import unittest
from research_public_catalogs_experimental import run_live, _json_get, open_library, crossref


def fake_transport(url):
    if url.startswith("https://openlibrary.org/search.json?"):
        return json.dumps({"docs": [
            {"key": "/works/OL123W", "title": "Estudios de Nueva York",
             "author_name": ["Una autora"], "first_publish_year": 2022},
            {"key": "/bad/other", "title": "Unsafe origin"},
        ]}).encode()
    if url.startswith("https://api.crossref.org/works?"):
        return json.dumps({"message": {"items": [
            {"DOI": "10.5555/example", "title": ["A Research Title"]},
            {"DOI": "https://evil.test", "title": ["Bad DOI"]},
        ]}}).encode()
    raise AssertionError("unapproved endpoint")


class PublicResearchAdaptersTests(unittest.TestCase):
    def test_openlibrary_and_crossref_preserve_source_provenance(self):
        result = run_live("New York", transport=fake_transport)
        self.assertEqual(len(result["sources"]), 2)
        self.assertEqual(result["verified_sources"], 0)
        self.assertFalse(result["live_network_attempted"])
        self.assertEqual({x["kind"] for x in result["sources"]}, {"library", "academic"})
        self.assertTrue(all(x["url"].startswith("https://") for x in result["sources"]))

    def test_invalid_query_and_provider_fail_closed(self):
        with self.assertRaises(ValueError):
            run_live("", transport=fake_transport)
        with self.assertRaises(ValueError):
            run_live("NYC", sources=("evil",), transport=fake_transport)
        with self.assertRaises(ValueError):
            _json_get("https://evil.test/search", {}, transport=fake_transport)

    def test_provider_failure_no_fabricated_results(self):
        def failing(_url):
            raise TimeoutError("network unavailable")
        result = run_live("bibliotecas", transport=failing)
        self.assertFalse(result["evidence_available"])
        self.assertEqual(len(result["provider_errors"]), 2)

    def test_invalid_destinations_ignored(self):
        books = open_library("NYC", transport=fake_transport)
        papers = crossref("NYC", transport=fake_transport)
        self.assertEqual(len(books), 1)
        self.assertEqual(len(papers), 1)
        self.assertTrue(books[0].url.startswith("https://openlibrary.org/works/"))

    def test_cannot_load_excessive_payload(self):
        with self.assertRaises(ValueError):
            _json_get("https://openlibrary.org/search.json", {"q":"books"},
                      transport=lambda _: b"x" * 100_000)

if __name__ == "__main__":
    unittest.main()
