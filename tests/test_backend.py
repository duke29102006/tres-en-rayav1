import tempfile
import unittest
from pathlib import Path

from server import get_scores, initialize_database, record_game


class ScoreDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database = Path(self.temporary_directory.name) / "test-scores.sqlite3"
        initialize_database(self.database)

    def tearDown(self):
        self.temporary_directory.cleanup()

    def test_records_wins_and_draws_in_persistent_totals(self):
        record_game("player1", "ai", 5, self.database)
        record_game("player2", "pvp", 8, self.database)
        scores = record_game("draw", "pvp", 27, self.database)

        self.assertEqual(scores, {"player1": 1, "player2": 1, "draws": 1})
        self.assertEqual(get_scores(self.database), scores)

    def test_rejects_invalid_results_modes_and_move_counts(self):
        for result, mode, moves in [
            ("unknown", "ai", 4),
            ("player1", "unknown", 4),
            ("draw", "ai", 28),
            ("draw", "ai", True),
        ]:
            with self.subTest(result=result, mode=mode, moves=moves):
                with self.assertRaises(ValueError):
                    record_game(result, mode, moves, self.database)

        self.assertEqual(get_scores(self.database), {"player1": 0, "player2": 0, "draws": 0})


if __name__ == "__main__":
    unittest.main()
