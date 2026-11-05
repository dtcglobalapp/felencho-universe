"""Static regression checks for experimental Brain specialty directory.

These checks do not execute Next.js, fetch sources or assert factual claims.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "lib" / "felenchoBrainSpecialties.ts"
PAGE = ROOT / "app" / "felencho-brain" / "especialidades" / "page.tsx"

class BrainSpecialtiesOfflineTests(unittest.TestCase):
    def test_expected_domains_present(self):
        content = REGISTRY.read_text()
        for name in ("derecho", "impuestos", "religiones", "medicina",
                     "economia", "historia", "vida_extraterrestre",
                     "conciencia_reencarnacion"):
            with self.subTest(name=name):
                self.assertIn('key: "' + name + '"', content)

    def test_claims_require_retrieval(self):
        content = REGISTRY.read_text()
        self.assertIn("evidenceRetrieved: false", content)
        self.assertIn('answerStatus: "no_verificado"', content)
        self.assertIn("canCiteVerifiedPassage", content)
        self.assertIn("corroborated", content)

    def test_no_runtime_integrations(self):
        for path in (REGISTRY, PAGE):
            content = path.read_text()
            for forbidden in ("OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY",
                              "LEMONSLICE_API_KEY", "fetch(", "axios("):
                with self.subTest(file=path.name, forbidden=forbidden):
                    self.assertNotIn(forbidden, content)

    def test_mobile_directory_is_readonly(self):
        text = PAGE.read_text()
        self.assertIn("SPECIALTIES.map", text)
        self.assertIn("target=\"_blank\"", text)
        self.assertNotIn('"use client"', text)
        self.assertNotIn("POST", text)

if __name__ == "__main__":
    unittest.main()
