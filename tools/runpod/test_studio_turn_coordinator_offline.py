"""Contract tests for atomic studio turn state, purely offline."""
import unittest

import studio_turn_coordinator_offline as studio

class StudioTurnCoordinatorTests(unittest.TestCase):
    def test_connect_and_presence_no_speech(self):
        s = studio.connect(studio.Studio())
        s = studio.listen(s, "lina")
        self.assertTrue(s.presence.connected)
        self.assertTrue(s.presence.lina.muted)
        self.assertEqual(s.presence.bob.mode, "idle")

    def test_speaker_and_audio_gate_always_agree(self):
        s = studio.connect(studio.Studio())
        s = studio.speak(s, "lina", "t1", presenter_granted=True)
        generation = s.gate.generation
        self.assertTrue(studio.accept_audio(s, "lina", "t1", generation))
        with self.assertRaises(ValueError):
            studio.speak(s, "bob", "t2", presenter_granted=True)
        s = studio.finish(s, "lina", "t1", generation)
        self.assertFalse(studio.accept_audio(s, "lina", "t1", generation))
        self.assertTrue(s.presence.lina.muted)

    def test_barge_in_and_release_keeps_old_chunks_invalid(self):
        s = studio.connect(studio.Studio())
        s = studio.speak(s, "lina", "repeat", presenter_granted=True)
        old_gen = s.gate.generation
        s = studio.presenter_interrupt(s)
        self.assertFalse(studio.accept_audio(s, "lina", "repeat", old_gen))
        with self.assertRaises(ValueError):
            studio.speak(s, "bob", "t2", presenter_granted=True)
        s = studio.presenter_release(s)
        s = studio.speak(s, "lina", "repeat", presenter_granted=True)
        self.assertFalse(studio.accept_audio(s, "lina", "repeat", old_gen))
        self.assertTrue(studio.accept_audio(s, "lina", "repeat", s.gate.generation))

    def test_sleep_active_cohost_invalidates_buffered_audio(self):
        s = studio.connect(studio.Studio())
        s = studio.speak(s, "bob", "one", presenter_granted=True)
        old_gen = s.gate.generation
        s = studio.sleep(s, "bob")
        self.assertEqual(s.presence.bob.mode, "sleeping")
        self.assertFalse(studio.accept_audio(s, "bob", "one", old_gen))
        self.assertIsNone(s.gate.active_actor)

    def test_disconnect_reconnect_does_not_restore_previous_audio(self):
        s = studio.connect(studio.Studio())
        s = studio.speak(s, "bob", "one", presenter_granted=True)
        old_gen = s.gate.generation
        s = studio.connect(studio.disconnect(s))
        s = studio.speak(s, "bob", "one", presenter_granted=True)
        self.assertFalse(studio.accept_audio(s, "bob", "one", old_gen))

    def test_inconsistent_state_fails_closed(self):
        s = studio.connect(studio.Studio())
        s = studio.speak(s, "bob", "one", presenter_granted=True)
        corrupt = studio.Studio(s.presence, studio.audio.Gate())
        with self.assertRaisesRegex(ValueError, "speaker_gate_desync"):
            studio.accept_audio(corrupt, "bob", "one", s.gate.generation)

    def test_ungranted_turn_does_not_mutate_state(self):
        s = studio.connect(studio.Studio())
        with self.assertRaises(ValueError):
            studio.speak(s, "bob", "one", presenter_granted=False)
        self.assertEqual(s.gate.generation, 0)

if __name__ == "__main__":
    unittest.main()
