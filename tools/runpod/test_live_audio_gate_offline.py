"""Offline tests of barge-in handling for Bob and Lina. No GPU or audio emitted."""
import importlib.util
from pathlib import Path
import unittest

source = Path(__file__).with_name("live_audio_gate_offline.py")
spec = importlib.util.spec_from_file_location("live_audio_gate", source)
gate = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = gate
spec.loader.exec_module(gate)

class AudioGateTests(unittest.TestCase):
    def test_presenter_interrupt_invalidates_queued_audio(self):
        a = gate.start(gate.Gate(), "lina", "first", granted=True)
        self.assertTrue(gate.allow_chunk(a, actor="lina", turn_id="first", generation=a.generation))
        b = gate.presenter_interrupt(a)
        self.assertFalse(gate.allow_chunk(b, actor="lina", turn_id="first", generation=a.generation))
        with self.assertRaises(ValueError):
            gate.start(b, "bob", "reply", granted=True)

    def test_new_turn_does_not_replay_old_chunks(self):
        first = gate.start(gate.Gate(), "lina", "repeat", granted=True)
        interrupted = gate.presenter_release(gate.presenter_interrupt(first))
        second = gate.start(interrupted, "lina", "repeat", granted=True)
        self.assertNotEqual(first.generation, second.generation)
        self.assertFalse(gate.allow_chunk(second, actor="lina", turn_id="repeat", generation=first.generation))
        self.assertTrue(gate.allow_chunk(second, actor="lina", turn_id="repeat", generation=second.generation))

    def test_only_one_cohost_speaks(self):
        a = gate.start(gate.Gate(), "bob", "hello", granted=True)
        with self.assertRaises(ValueError):
            gate.start(a, "lina", "wait", granted=True)
        self.assertFalse(gate.allow_chunk(a, actor="lina", turn_id="hello", generation=a.generation))

    def test_reject_ungranted_and_invalid_turn(self):
        with self.assertRaises(ValueError):
            gate.start(gate.Gate(), "bob", "hello", granted=False)
        with self.assertRaises(ValueError):
            gate.start(gate.Gate(), "unknown", "hello", granted=True)
        with self.assertRaises(ValueError):
            gate.start(gate.Gate(), "lina", "hello;rm -rf", granted=True)

    def test_completion_invalidates_late_audio(self):
        current = gate.start(gate.Gate(), "bob", "one", granted=True)
        done = gate.complete(current, actor="bob", turn_id="one", generation=current.generation)
        self.assertFalse(gate.allow_chunk(done, actor="bob", turn_id="one", generation=current.generation))
        self.assertIsNone(done.active_actor)
        with self.assertRaises(ValueError):
            gate.complete(done, actor="bob", turn_id="one", generation=current.generation)

if __name__ == "__main__":
    unittest.main()
