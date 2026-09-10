import unittest
import numpy as np

from process_recordings import RATE, decode, encode, measure, process


class ProcessingTests(unittest.TestCase):
    def test_trim_keeps_activity_margins_and_internal_pause(self):
        rng = np.random.default_rng(42)
        signal = rng.normal(0, .0002, RATE * 4)
        for start, end in ((1, 1.4), (2, 2.5)):
            a, b = int(start * RATE), int(end * RATE)
            signal[a:b] += .04 * np.sin(2 * np.pi * 300 * np.arange(b-a) / RATE)
        result, before, actions, flags = process(signal)
        self.assertLessEqual(actions["retainedStartSample"], before["activityStartSample"] - 4000)
        self.assertGreaterEqual(actions["retainedEndSample"], before["activityEndSample"] + 4000)
        self.assertEqual(len(result), actions["retainedEndSample"] - actions["retainedStartSample"])
        self.assertLess(actions["retainedStartSample"], RATE)
        self.assertGreater(actions["retainedEndSample"], int(RATE * 2.5))
        original = signal[actions["retainedStartSample"]:actions["retainedEndSample"]] - signal.mean()
        np.testing.assert_allclose(result[80:-80], original[80:-80] * 10 ** ((-26-before["activeRmsDbfs"])/20))
        restored, _ = decode(encode(result))
        self.assertEqual(len(restored), len(result))
        self.assertEqual(measure(restored)["clippedSamples"], 0)

    def test_silence_stays_unchanged_and_is_flagged(self):
        signal = np.zeros(RATE)
        result, _, actions, flags = process(signal)
        np.testing.assert_array_equal(signal, result)
        self.assertTrue(flags)
        self.assertEqual(actions["gainDb"], 0)

    def test_quiet_audio_gain_is_capped_and_source_is_not_modified(self):
        signal = np.zeros(RATE * 3)
        signal[RATE:RATE*2] = .0008 * np.sin(2*np.pi*200*np.arange(RATE)/RATE)
        original = signal.copy()
        result, _, actions, flags = process(signal)
        np.testing.assert_array_equal(signal, original)
        # This is below the conservative absolute activity threshold: preserve and flag.
        self.assertTrue(flags)
        self.assertLessEqual(actions["gainDb"], 12)
        self.assertLessEqual(np.max(np.abs(result)), 10 ** (-3/20))


if __name__ == "__main__":
    unittest.main()
