import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('configure_ai', Path(__file__).with_name('configure-ai.py'))
configure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(configure)


class ConfigureAiTests(unittest.TestCase):
    def test_import_preserves_student_policy_and_protects_secrets_and_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / '.env'
            old = 'DASHSCOPE_API_KEY=\ndashscope_api_key=old-fixture\nEDU_STUDENT_AI_ENABLED=false\nEDU_ACCOUNT_MIN_PASSWORD_LENGTH=6\n'
            target.write_text(old)
            backup, names = configure.persist_keys(target, root / 'backups', {'DASHSCOPE_API_KEY': ' ', 'dashscope_api_key': ' synthetic-key '})
            self.assertEqual(names, ['DASHSCOPE_API_KEY'])
            self.assertIn('DASHSCOPE_API_KEY="synthetic-key"', target.read_text())
            self.assertNotIn('dashscope_api_key=', target.read_text())
            self.assertIn('EDU_STUDENT_AI_ENABLED=false', target.read_text())
            self.assertIn('EDU_ACCOUNT_MIN_PASSWORD_LENGTH=6', target.read_text())
            self.assertEqual((backup / 'campus.env').read_text(), old)
            for path in [target, backup / 'campus.env']:
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_missing_or_malformed_key_does_not_change_config(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / '.env'
            target.write_text('EDU_STUDENT_AI_ENABLED=false\n')
            for values in [{}, {'DASHSCOPE_API_KEY': ' '}, {'DASHSCOPE_API_KEY': 'key\nother'}]:
                with self.assertRaises(ValueError):
                    configure.persist_keys(target, root / 'backups', values)
            self.assertEqual(target.read_text(), 'EDU_STUDENT_AI_ENABLED=false\n')
            self.assertFalse((root / 'backups').exists())


if __name__ == '__main__':
    unittest.main()
