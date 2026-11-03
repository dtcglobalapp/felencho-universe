"""Offline live cohost state tests; no media or model execution."""
import unittest

from live_cohost_state_offline import (
    Session, begin_turn, connect, disconnect, finish_turn, interrupt,
    listen, sleep_actor,
)

class LiveCohostStateTests(unittest.TestCase):
    def test_both_remain_connected_when_not_speaking(self):
        session = connect(Session())
        self.assertTrue(session.connected)
        self.assertEqual(session.bob.mode, "idle")
        self.assertEqual(session.lina.mode, "idle")
        self.assertTrue(session.bob.muted)
        self.assertTrue(session.lina.muted)
        session = listen(session, "bob")
        self.assertEqual(session.lina.mode, "idle")

    def test_turns_are_mutually_exclusive(self):
        session = connect(Session())
        session = begin_turn(session, "lina", "turn-1", presenter_granted=True)
        self.assertEqual(session.lina.mode, "speaking")
        self.assertFalse(session.lina.muted)
        with self.assertRaisesRegex(ValueError, "turn_not_granted"):
            begin_turn(session, "bob", "turn-2", presenter_granted=True)
        session = finish_turn(session, "lina", "turn-1")
        self.assertTrue(session.lina.muted)
        session = begin_turn(session, "bob", "turn-2", presenter_granted=True)
        self.assertEqual(session.active_speaker, "bob")

    def test_presenter_has_explicit_control(self):
        session = connect(Session())
        with self.assertRaisesRegex(ValueError, "turn_not_granted"):
            begin_turn(session, "lina", "turn-1", presenter_granted=False)
        session = begin_turn(session, "lina", "turn-1", presenter_granted=True)
        session = interrupt(session)
        self.assertIsNone(session.active_speaker)
        self.assertTrue(session.lina.muted)
        self.assertEqual(session.bob.mode, "idle")
        with self.assertRaisesRegex(ValueError, "stale_or_invalid_turn"):
            finish_turn(session, "lina", "turn-1")

    def test_sleep_and_disconnect(self):
        session = connect(Session())
        session = begin_turn(session, "bob", "t1", presenter_granted=True)
        session = sleep_actor(session, "bob")
        self.assertTrue(session.connected)
        self.assertEqual(session.bob.mode, "sleeping")
        self.assertIsNone(session.active_speaker)
        self.assertEqual(session.lina.mode, "idle")
        self.assertFalse(disconnect(session).connected)

    def test_invalid_actors_and_ids_rejected(self):
        session = connect(Session())
        for actor in ("system", "felencho", ""):
            with self.subTest(actor=actor), self.assertRaises(ValueError):
                listen(session, actor)
        for turn_id in ("", "../path", "hello world", "a"*65):
            with self.subTest(turn_id=turn_id), self.assertRaises(ValueError):
                begin_turn(session, "lina", turn_id, presenter_granted=True)

if __name__ == "__main__":
    unittest.main()
