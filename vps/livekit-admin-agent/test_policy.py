import unittest

from policy import (
    PolicyError,
    classify_path,
    confirmation_matches,
    content_has_secret,
    host_action_allowed,
    is_allowed_container,
    is_terminal_path,
    join_writable,
    validate_exec_argv,
    validate_redis_conf,
)


class PolicyTests(unittest.TestCase):
    def test_blocks_secret_and_traversal(self) -> None:
        self.assertFalse(is_terminal_path("/opt/livekit/livekit.pinf.com.ge/livekit.yaml"))
        self.assertFalse(is_terminal_path("/opt/livekit-admin-agent/.env"))
        self.assertFalse(is_terminal_path("/opt/livekit/livekit.pinf.com.ge/caddy_data/certs"))
        self.assertFalse(is_terminal_path("/var/log/../etc/passwd"))
        self.assertFalse(is_terminal_path("/etc/passwd"))
        self.assertFalse(is_terminal_path("/var/log/auth.log"))
        self.assertTrue(is_terminal_path("/opt/livekit/livekit.pinf.com.ge/caddy.yaml"))
        self.assertTrue(is_terminal_path("/var/log/syslog"))
        self.assertTrue(is_terminal_path("caddy.yaml"))

    def test_write_root(self) -> None:
        listed = classify_path("/opt/livekit/livekit.pinf.com.ge")
        self.assertFalse(listed["writable"])
        config = classify_path("/opt/livekit/livekit.pinf.com.ge/caddy.yaml")
        self.assertTrue(config["writable"])
        self.assertTrue(config["important"])
        with self.assertRaises(PolicyError):
            classify_path("/opt/livekit/livekit.pinf.com.ge/livekit.yaml")
        created = join_writable("/opt/livekit/livekit.pinf.com.ge", "notes.txt")
        self.assertEqual(created, "/opt/livekit/livekit.pinf.com.ge/notes.txt")
        with self.assertRaises(PolicyError):
            join_writable("/var/log", "notes.txt")

    def test_exec_allowlist(self) -> None:
        validate_exec_argv(["docker", "ps"])
        validate_exec_argv(["docker", "logs", "--tail", "100", "livekitpinfcomge-livekit-1"])
        validate_exec_argv(["ls", "-la", "/opt/livekit/livekit.pinf.com.ge"])
        validate_exec_argv(["systemctl", "--no-pager", "status", "docker"])
        with self.assertRaises(PolicyError):
            validate_exec_argv(["docker", "logs", "--tail", "100", "evil"])
        with self.assertRaises(PolicyError):
            validate_exec_argv(["cat", "/opt/livekit-admin-agent/.env"])
        with self.assertRaises(PolicyError):
            validate_exec_argv(["bash", "-lc", "id"])
        with self.assertRaises(PolicyError):
            validate_exec_argv(["systemctl", "restart", "docker"])

    def test_services_and_secrets(self) -> None:
        self.assertTrue(is_allowed_container("livekitpinfcomge-caddy-1"))
        self.assertFalse(is_allowed_container("nginx"))
        self.assertTrue(host_action_allowed("docker", "restart"))
        self.assertFalse(host_action_allowed("docker", "stop"))
        self.assertFalse(host_action_allowed("ssh", "restart"))
        self.assertTrue(confirmation_matches("reboot", "REBOOT"))
        self.assertFalse(confirmation_matches("reboot", "reboot"))
        self.assertTrue(content_has_secret("api_key: super-secret-value"))
        self.assertFalse(content_has_secret("listen: [:443]"))
        validate_redis_conf("bind 127.0.0.1\nport 6379\n")
        with self.assertRaises(PolicyError):
            validate_redis_conf("requirepass hunter2\n")


if __name__ == "__main__":
    unittest.main()
