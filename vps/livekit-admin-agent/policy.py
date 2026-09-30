"""Allowlists for the LiveKit admin agent.

Paths are checked as POSIX strings so the rules do not depend on the machine
that imports this module. The agent resolves symlinks again before reading.
"""

from __future__ import annotations

import re

READ_ROOTS = (
    "/opt/livekit/livekit.pinf.com.ge",
    "/opt/livekit-admin-agent",
    "/var/log",
)

WRITE_ROOT = "/opt/livekit/livekit.pinf.com.ge"

CONTAINERS = (
    "livekitpinfcomge-livekit-1",
    "livekitpinfcomge-caddy-1",
    "livekitpinfcomge-redis-1",
)

HOST_SERVICES = {
    "livekit-admin-agent": {"start", "stop", "restart"},
    "docker": {"restart"},
}

HOST_LOGS = {
    "syslog": "/var/log/syslog",
    "kern": "/var/log/kern.log",
    "agent": "journal:livekit-admin-agent",
}

CONFIRM = {
    "start": "START",
    "stop": "STOP",
    "restart": "RESTART",
    "delete": "DELETE",
    "reboot": "REBOOT",
    "save": "SAVE",
}

DENIED_PARTS = {
    ".ssh",
    ".aws",
    ".env",
    ".venv",
    ".git",
    "caddy_data",
    "private",
    "journal",
    "__pycache__",
    "backups",
}

SECRET_BASENAMES = {
    ".env",
    "shadow",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "credentials.json",
    "environ",
    "auth.log",
    "btmp",
    "wtmp",
    "lastlog",
    "livekit.yaml",
    "init_script.sh",
    "audit.log",
}

WRITABLE_EXTENSIONS = {".yaml", ".yml", ".conf", ".txt", ".md", ".json"}

IMPORTANT_FILES = {"docker-compose.yaml", "caddy.yaml", "redis.conf"}

REDIS_DIRECTIVES = {
    "bind",
    "protected-mode",
    "port",
    "timeout",
    "tcp-keepalive",
    "daemonize",
    "supervised",
    "loglevel",
    "databases",
    "save",
    "stop-writes-on-bgsave-error",
    "rdbcompression",
    "appendonly",
    "appendfsync",
    "maxmemory",
    "maxmemory-policy",
}

SECRET_VALUE = re.compile(
    r"(?i)\b(api[_-]?key|api[_-]?secret|secret|password|passwd|token|private[_-]?key|client_secret)\b\s*[:=]\s*\S+"
)
PRIVATE_KEY = re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")
PACKAGE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$")
UNIT_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9@._-]{0,80}$")


class PolicyError(ValueError):
    pass


def basename(path: str) -> str:
    return path.rstrip("/").split("/")[-1]


def is_secret_basename(name: str) -> bool:
    base = name.lower()
    if base.startswith(".env"):
        return True
    if base in SECRET_BASENAMES:
        return True
    return bool(re.search(r"\.(pem|key|p12|pfx)$", base))


def normalize_absolute(value: str) -> str:
    if not isinstance(value, str) or not value or len(value) > 240:
        raise PolicyError("That path is not allowed.")
    if "\x00" in value or "\\" in value or not value.startswith("/"):
        raise PolicyError("That path is not allowed.")
    if not re.fullmatch(r"[/A-Za-z0-9_@.+-]+", value):
        raise PolicyError("That path is not allowed.")

    parts: list[str] = []
    for part in value.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            raise PolicyError("That path is not allowed.")
        parts.append(part)
    return "/" + "/".join(parts)


def _under(path: str, root: str) -> bool:
    return path == root or path.startswith(root + "/")


def _denied(path: str) -> bool:
    return any(part.lower() in DENIED_PARTS for part in path.split("/")) or is_secret_basename(
        basename(path)
    )


def is_terminal_path(value: str) -> bool:
    if not value or len(value) > 200:
        return False
    if not re.fullmatch(r"[A-Za-z0-9_./@+-]+", value):
        return False
    if ".." in value.split("/"):
        return False
    if is_secret_basename(basename(value)):
        return False
    if any(part.lower() in DENIED_PARTS for part in value.split("/")):
        return False
    if not value.startswith("/"):
        return True
    try:
        normalized = normalize_absolute(value)
    except PolicyError:
        return False
    return any(_under(normalized, root) for root in READ_ROOTS)


def classify_path(value: str) -> dict[str, object]:
    path = normalize_absolute(value)
    if _denied(path) or not any(_under(path, root) for root in READ_ROOTS):
        raise PolicyError("That path is outside the allowed directories.")
    writable = _under(path, WRITE_ROOT) and path != WRITE_ROOT
    return {
        "path": path,
        "writable": writable,
        "important": basename(path) in IMPORTANT_FILES,
    }


def is_write_directory(value: str) -> bool:
    path = str(classify_path(value)["path"])
    return path == WRITE_ROOT or _under(path, WRITE_ROOT)


def is_creatable_filename(name: str) -> bool:
    return is_writable_filename(name) and name not in IMPORTANT_FILES


def is_writable_filename(name: str) -> bool:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,80}", name):
        return False
    if is_secret_basename(name):
        return False
    dot = name.rfind(".")
    if dot <= 0:
        return False
    return name[dot:].lower() in WRITABLE_EXTENSIONS


def join_writable(directory: str, name: str) -> str:
    if not is_write_directory(directory) or not is_writable_filename(name):
        raise PolicyError("That file cannot be created here.")
    directory = str(classify_path(directory)["path"])
    return f"{directory}/{name}"


def content_has_secret(text: str) -> bool:
    return PRIVATE_KEY.search(text) is not None or SECRET_VALUE.search(text) is not None


def public_error(text: str) -> str:
    redacted = SECRET_VALUE.sub(lambda match: f"{match.group(1)}: ***", text)
    redacted = PRIVATE_KEY.sub("***", redacted)
    cleaned = " ".join(redacted.split())
    return cleaned[-400:]


def validate_redis_conf(text: str) -> None:
    if "\x00" in text or len(text) > 200_000:
        raise PolicyError("That Redis configuration is not valid.")
    saw_directive = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        directive = parts[0].lower()
        if directive not in REDIS_DIRECTIVES:
            raise PolicyError(f"Redis directive {directive} is not allowed.")
        if any(len(part) > 200 for part in parts):
            raise PolicyError("That Redis configuration is not valid.")
        saw_directive = True
    if not saw_directive:
        raise PolicyError("Redis configuration is empty.")


def confirmation_matches(kind: str, value: str | None) -> bool:
    return value == CONFIRM[kind]


def is_allowed_container(name: str) -> bool:
    return name in CONTAINERS


def host_action_allowed(service: str, action: str) -> bool:
    return action in HOST_SERVICES.get(service, set())


def _bounded_int(value: str, maximum: int) -> bool:
    return bool(re.fullmatch(r"[0-9]{1,6}", value)) and 1 <= int(value) <= maximum


def validate_exec_argv(argv: list[str]) -> None:
    if not argv or len(argv) > 12 or any(not isinstance(part, str) for part in argv):
        raise PolicyError("Command not allowed")

    program = argv[0]
    args = argv[1:]

    if program == "docker":
        _validate_docker(args)
        return
    if program in {"ls", "cat", "grep"}:
        _validate_readonly(program, args)
        return
    if program in {"pip", "pip3"}:
        if len(args) != 2 or args[0] != "show" or not PACKAGE_NAME.fullmatch(args[1]):
            raise PolicyError("Command not allowed")
        return
    if program == "systemctl":
        _validate_systemctl(args)
        return
    raise PolicyError("Command not allowed")


def _validate_docker(args: list[str]) -> None:
    if not args:
        raise PolicyError("Command not allowed")
    if args[0] == "ps":
        index = 1
        while index < len(args):
            arg = args[index]
            if arg in {"-a", "--all", "-q", "--quiet", "--no-trunc"}:
                index += 1
                continue
            if arg in {"-n", "--last"}:
                if index + 1 >= len(args) or not _bounded_int(args[index + 1], 100):
                    raise PolicyError("Command not allowed")
                index += 2
                continue
            if arg == "--format":
                if index + 1 >= len(args) or not re.fullmatch(r"[\w{} .:|,()/-]{1,120}", args[index + 1]):
                    raise PolicyError("Command not allowed")
                index += 2
                continue
            if arg == "--filter":
                if index + 1 >= len(args) or not re.fullmatch(r"[A-Za-z0-9_.=:/-]{1,120}", args[index + 1]):
                    raise PolicyError("Command not allowed")
                index += 2
                continue
            raise PolicyError("Command not allowed")
        return

    if args[0] != "logs":
        raise PolicyError("Command not allowed")

    positionals: list[str] = []
    index = 1
    while index < len(args):
        arg = args[index]
        if arg in {"-f", "--follow"}:
            raise PolicyError("Command not allowed")
        if arg in {"-t", "--timestamps", "--details"}:
            index += 1
            continue
        if arg in {"--tail", "-n"}:
            if index + 1 >= len(args) or not _bounded_int(args[index + 1], 500):
                raise PolicyError("Command not allowed")
            index += 2
            continue
        if arg.startswith("--tail="):
            if not _bounded_int(arg.split("=", 1)[1], 500):
                raise PolicyError("Command not allowed")
            index += 1
            continue
        if arg in {"--since", "--until"}:
            if index + 1 >= len(args) or not re.fullmatch(r"[0-9]{1,6}[smhd]|[0-9T:Z.+-]{1,32}", args[index + 1]):
                raise PolicyError("Command not allowed")
            index += 2
            continue
        if arg.startswith("-"):
            raise PolicyError("Command not allowed")
        positionals.append(arg)
        index += 1

    if len(positionals) != 1 or not is_allowed_container(positionals[0]):
        raise PolicyError("Command not allowed")


def _validate_readonly(program: str, args: list[str]) -> None:
    if program == "cat" and not 1 <= len(args) <= 5:
        raise PolicyError("Command not allowed")
    for arg in args:
        if arg.startswith("-"):
            if program == "cat":
                raise PolicyError("Command not allowed")
            if program == "ls" and arg not in {"--all", "--human-readable"} and not re.fullmatch(r"-[lah1]+", arg):
                raise PolicyError("Command not allowed")
            if program == "grep" and not re.fullmatch(r"-{1,2}[A-Za-z0-9-]+", arg) and not _bounded_int(arg.lstrip("-"), 500):
                raise PolicyError("Command not allowed")
            continue
        if program == "grep" and _bounded_int(arg, 500):
            continue
        if not is_terminal_path(arg):
            raise PolicyError("Command not allowed")


def _validate_systemctl(args: list[str]) -> None:
    if "status" not in args:
        raise PolicyError("Command not allowed")
    blocked = {"start", "stop", "restart", "enable", "disable", "mask", "edit", "cat", "daemon-reload"}
    if any(arg in blocked for arg in args):
        raise PolicyError("Command not allowed")
    for arg in args:
        if arg.startswith("-") or arg in {"status", "--no-pager", "--full", "--no-legend"}:
            continue
        if arg in {"--lines"}:
            continue
        if not UNIT_NAME.fullmatch(arg) and not _bounded_int(arg, 200):
            raise PolicyError("Command not allowed")
