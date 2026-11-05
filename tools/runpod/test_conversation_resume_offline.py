"""Offline tests for context-based continuation without stale speech replay."""
import unittest
import conversation_resume_offline as memory

class ConversationResumeTests(unittest.TestCase):
    def test_interruption_prepares_context_not_replay(self):
        s = memory.begin(memory.Memory(), "lina", "l1", "Transporte de Nueva York")
        s = memory.delivered(s, "lina", "l1", "Los pasajeros necesitan respuestas.")
        s = memory.interrupt(s, "Lina, ¿qué opina Bob?")
        brief = memory.resume_brief(s, "lina")
        self.assertFalse(brief["automatic_replay"])
        self.assertEqual(brief["topic"], "Transporte de Nueva York")
        self.assertEqual(brief["presenter_latest_question"], "Lina, ¿qué opina Bob?")
        self.assertIn("Los pasajeros necesitan respuestas.",
                      brief["delivered_text_not_verified_audible"])
        self.assertIsNone(s.active)

    def test_interrupted_lina_can_resume_after_bob(self):
        s = memory.begin(memory.Memory(), "lina", "l1", "Las bicicletas")
        s = memory.interrupt(s, "Bob, tu opinión")
        s = memory.begin(s, "bob", "b1", "Las bicicletas")
        s = memory.delivered(s, "bob", "b1", "Es complicado.")
        s = memory.finish(s, "bob", "b1")
        brief = memory.resume_brief(s, "lina")
        self.assertEqual(brief["topic"], "Las bicicletas")
        self.assertFalse(brief["automatic_replay"])

    def test_stale_delivery_and_finish_rejected(self):
        s = memory.begin(memory.Memory(), "bob", "b1", "La salud")
        s = memory.interrupt(s, "Bob, espera")
        with self.assertRaisesRegex(ValueError, "stale_delivery"):
            memory.delivered(s, "bob", "b1", "Fragmento tardío")
        with self.assertRaisesRegex(ValueError, "stale_finish"):
            memory.finish(s, "bob", "b1")

    def test_bounds_and_reset(self):
        with self.assertRaises(ValueError):
            memory.begin(memory.Memory(), "lina", "bad id", "Tema")
        s = memory.begin(memory.Memory(), "lina", "l1", "Tema")
        for i in range(16):
            s = memory.delivered(s, "lina", "l1", str(i))
        with self.assertRaisesRegex(ValueError, "checkpoint_full"):
            memory.delivered(s, "lina", "l1", "extra")
        s = memory.interrupt(s, "Continúa luego")
        cleared = memory.clear(s)
        with self.assertRaisesRegex(ValueError, "no_interrupted_context"):
            memory.resume_brief(cleared, "lina")

    def test_cannot_resume_without_context_or_during_speech(self):
        with self.assertRaises(ValueError):
            memory.resume_brief(memory.Memory(), "bob")
        s = memory.begin(memory.Memory(), "bob", "b1", "Tema")
        with self.assertRaisesRegex(ValueError, "resume_not_allowed"):
            memory.resume_brief(s, "bob")

if __name__ == "__main__":
    unittest.main()
