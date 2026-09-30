from __future__ import annotations

import hmac
import json
import os
import shutil
import socket
import subprocess
import time
from typing import Any

import psutil
from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel

import policy

app = FastAPI()

AGENT_TOKEN = os.environ["ADMIN_AGENT_TOKEN"]
AUDIT_PATH = "/opt/livekit-admin-agent/audit.log"
BACKUP_DIR = "/opt/livekit-admin-agent/backups"
MAX_FILE_BYTES = 200_000

SERVICES = {
    "livekit": "livekitpinfcomge-livekit-1",
    "caddy": "livekitpinfcomge-caddy-1",
    "redis": "livekitpinfcomge-redis-1",
}

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")


def authenticate(token: str | None) -> None:
    if token is None or not hmac.compare_digest(token, AGENT_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def actor_name(value: str | None) -> str:
    if value and len(value) <= 200 and all(char.isascii() and (char.isalnum() or char in "._%+-@") for char in value):
        return value
    return "unknown"


def audit(actor: str | None, action: str, target: str, ok: bool, detail: str = "") -> None:
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "actor": actor_name(actor),
        "action": action[:80],
        "target": target[:300],
        "ok": ok,
        "detail": policy.public_error(detail)[:300],
    }
    try:
        with open(AUDIT_PATH, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except OSError:
        return


def run_argv(argv: list[str], timeout: int = 30) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,
        capture_output=True,
        text=True,
        shell=False,
        timeout=timeout,
        check=False,
    )


def needs_sudo(result: subprocess.CompletedProcess[str]) -> bool:
    text = f"{result.stderr}\n{result.stdout}".lower()
    return (
        "permission denied" in text
        or "access denied" in text
        or "interactive authentication" in text
        or "a password is required" in text
    )


def docker_status() -> dict[str, str]:
    result = run_argv(["docker", "ps", "--format", "{{.Names}}|{{.Status}}"])
    if result.returncode != 0:
        raise HTTPException(status_code=502, detail="Docker is unavailable")

    services: dict[str, str] = {}
    for line in result.stdout.strip().splitlines():
        if not line or "|" not in line:
            continue
        name, status = line.split("|", 1)
        services[name] = status
    return services


def service_status(service: str) -> dict[str, Any]:
    container = SERVICES[service]
    result = run_argv(
        [
            "docker",
            "inspect",
            "--format",
            "{{.State.Status}}|{{.State.Running}}|{{.State.StartedAt}}",
            container,
        ]
    )
    if result.returncode != 0:
        return {
            "service": service,
            "container": container,
            "status": "not_found",
            "running": False,
        }

    parts = result.stdout.strip().split("|")
    return {
        "service": service,
        "container": container,
        "status": parts[0] if parts else "unknown",
        "running": parts[1] == "true" if len(parts) > 1 else False,
        "started_at": parts[2] if len(parts) > 2 else None,
    }


def system_metrics() -> dict[str, Any]:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    load = os.getloadavg() if hasattr(os, "getloadavg") else (0.0, 0.0, 0.0)
    network = psutil.net_io_counters()
    return {
        "hostname": socket.gethostname(),
        "cpu": {
            "percent": psutil.cpu_percent(interval=0.2),
            "cores": psutil.cpu_count(logical=True),
            "load_1m": load[0],
            "load_5m": load[1],
            "load_15m": load[2],
        },
        "memory": {
            "total": memory.total,
            "used": memory.used,
            "available": memory.available,
            "percent": memory.percent,
        },
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "available": disk.free,
            "percent": disk.percent,
        },
        "uptime": {"seconds": max(0, int(time.time() - psutil.boot_time()))},
        "network": {
            "bytes_sent": network.bytes_sent,
            "bytes_received": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_received": network.packets_recv,
        },
    }


def get_logs(container: str, lines: int) -> str:
    result = run_argv(["docker", "logs", "--tail", str(lines), "--timestamps", container])
    output = result.stdout
    if result.stderr:
        output += result.stderr
    return output[-30000:]


async def livekit_rooms() -> dict[str, Any]:
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        return {"configured": False, "rooms": [], "room_count": 0, "participant_count": 0}

    try:
        from livekit import api

        lkapi = api.LiveKitAPI(
            url="http://127.0.0.1:7880",
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
        response = await lkapi.room.list_rooms(api.ListRoomsRequest())
        rooms = [
            {
                "name": room.name,
                "sid": room.sid,
                "num_participants": room.num_participants,
                "num_publishers": room.num_publishers,
                "creation_time": room.creation_time,
            }
            for room in response.rooms
        ]
        await lkapi.aclose()
        return {
            "configured": True,
            "rooms": rooms,
            "room_count": len(rooms),
            "participant_count": sum(room["num_participants"] for room in rooms),
        }
    except Exception as exc:
        return {
            "configured": True,
            "rooms": [],
            "room_count": 0,
            "participant_count": 0,
            "error": policy.public_error(str(exc)),
        }


class ExecRequest(BaseModel):
    argv: list[str]


class ConfirmBody(BaseModel):
    confirm: str = ""


class FileBody(BaseModel):
    path: str
    content: str = ""
    confirm: str = ""


class RenameBody(BaseModel):
    path: str
    to: str
    confirm: str = ""


class DeleteBody(BaseModel):
    path: str
    confirm: str


def policy_error(exc: policy.PolicyError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def real_allowed(path: str, *, write: bool) -> str:
    try:
        classified = policy.classify_path(path)
    except policy.PolicyError as exc:
        raise policy_error(exc) from exc

    normalized = str(classified["path"])
    if write and not classified["writable"]:
        raise HTTPException(status_code=403, detail="That file cannot be changed.")

    real = os.path.realpath(normalized)
    if real != normalized:
        try:
            policy.classify_path(real)
        except policy.PolicyError as exc:
            raise HTTPException(status_code=403, detail="That path is not allowed.") from exc
        if write and not policy.classify_path(real)["writable"]:
            raise HTTPException(status_code=403, detail="That file cannot be changed.")
    return real


def ensure_text(content: str) -> None:
    if len(content.encode("utf-8")) > MAX_FILE_BYTES or "\x00" in content:
        raise HTTPException(status_code=400, detail="That file is too large or is not text.")
    if policy.content_has_secret(content):
        raise HTTPException(status_code=403, detail="Files containing secrets cannot be saved here.")


def read_text(path: str) -> str:
    if not os.path.isfile(path) or os.path.islink(path):
        raise HTTPException(status_code=404, detail="File not found")
    size = os.path.getsize(path)
    if size > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="That file is too large to read here.")
    with open(path, "r", encoding="utf-8", errors="replace") as handle:
        content = handle.read(MAX_FILE_BYTES + 1)
    if "\x00" in content:
        raise HTTPException(status_code=400, detail="That file is not text.")
    if policy.content_has_secret(content):
        raise HTTPException(status_code=403, detail="That file contains secrets and cannot be shown.")
    return content


def backup_file(path: str) -> str:
    os.makedirs(BACKUP_DIR, mode=0o700, exist_ok=True)
    destination = os.path.join(BACKUP_DIR, f"{os.path.basename(path)}.{time.strftime('%Y%m%d%H%M%S')}")
    shutil.copy2(path, destination)
    return destination


def validate_written_config(path: str) -> None:
    name = os.path.basename(path)
    if name == "redis.conf":
        try:
            with open(path, "r", encoding="utf-8") as handle:
                policy.validate_redis_conf(handle.read())
        except policy.PolicyError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return
    if name == "caddy.yaml":
        result = run_argv(
            [
                "docker",
                "run",
                "--rm",
                "--network",
                "none",
                "-v",
                f"{path}:/etc/caddy.yaml:ro",
                "--entrypoint",
                "caddy",
                "livekit/caddyl4",
                "validate",
                "--config",
                "/etc/caddy.yaml",
                "--adapter",
                "yaml",
            ],
            timeout=60,
        )
    elif name == "docker-compose.yaml":
        result = run_argv(["docker", "compose", "-f", path, "config"], timeout=30)
    else:
        return

    if result.returncode != 0:
        raise HTTPException(status_code=400, detail=policy.public_error(result.stderr or result.stdout or "Configuration is invalid"))


def restore_backup(path: str, backup: str | None) -> None:
    if backup and os.path.isfile(backup):
        shutil.copy2(backup, path)


def tail_file(path: str, lines: int) -> str:
    with open(path, "rb") as handle:
        handle.seek(0, os.SEEK_END)
        size = handle.tell()
        handle.seek(max(0, size - 200_000))
        data = handle.read().decode("utf-8", "replace")
    if policy.content_has_secret(data):
        data = policy.SECRET_VALUE.sub(lambda match: f"{match.group(1)}: ***", data)
    return "\n".join(data.splitlines()[-lines:])


def sanitize_command(parts: list[str]) -> str:
    cleaned: list[str] = []
    for part in parts[:8]:
        if policy.content_has_secret(part) or len(part) > 80:
            cleaned.append("***")
        else:
            cleaned.append(part)
    return " ".join(cleaned)


def network_interfaces() -> list[dict[str, Any]]:
    counters = psutil.net_io_counters(pernic=True)
    addresses = psutil.net_if_addrs()
    interfaces: list[dict[str, Any]] = []
    for name, info in sorted(counters.items()):
        ips = []
        for address in addresses.get(name, []):
            family = getattr(address.family, "name", "")
            if not address.address or family in {"AF_PACKET", "AF_LINK"}:
                continue
            ips.append(address.address)
        interfaces.append(
            {
                "name": name,
                "bytes_sent": info.bytes_sent,
                "bytes_received": info.bytes_recv,
                "addresses": ips[:8],
            }
        )
    return interfaces


def process_rows(limit: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for process in psutil.process_iter(["pid", "name", "username", "status"]):
        try:
            info = process.info
            rows.append(
                {
                    "pid": info.get("pid"),
                    "name": info.get("name") or "",
                    "user": info.get("username") or "",
                    "status": info.get("status") or "",
                    "memory": process.memory_info().rss,
                    "command": sanitize_command(process.cmdline()),
                }
            )
        except (psutil.Error, OSError):
            continue
    rows.sort(key=lambda row: int(row["memory"]), reverse=True)
    return rows[:limit]


def host_service_status(unit: str) -> dict[str, Any]:
    result = run_argv(["/usr/bin/systemctl", "is-active", unit])
    active = result.stdout.strip() or "unknown"
    return {"service": unit, "active": active, "running": active == "active"}


def systemctl_action(action: str, unit: str) -> subprocess.CompletedProcess[str]:
    argv = ["/usr/bin/systemctl", action, unit]
    result = run_argv(argv)
    if needs_sudo(result):
        result = run_argv(["sudo", "-n", *argv])
    return result


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/exec")
def execute_command(
    request: ExecRequest,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    try:
        policy.validate_exec_argv(request.argv)
    except policy.PolicyError as exc:
        audit(x_admin_actor, "terminal.exec", " ".join(request.argv[:4]), False, str(exc))
        raise HTTPException(status_code=403, detail="Command not allowed") from exc

    try:
        result = run_argv(request.argv)
    except subprocess.TimeoutExpired as exc:
        audit(x_admin_actor, "terminal.exec", " ".join(request.argv), False, "timeout")
        raise HTTPException(status_code=504, detail="The command timed out") from exc

    audit(x_admin_actor, "terminal.exec", " ".join(request.argv), result.returncode == 0)
    return {"stdout": result.stdout[-64000:], "stderr": result.stderr[-64000:], "exit_code": result.returncode}


@app.get("/status")
def status(x_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    authenticate(x_agent_token)
    return {
        "status": "online",
        "docker": docker_status(),
        "services": {service: service_status(service) for service in SERVICES},
    }


@app.get("/metrics")
def metrics(x_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    authenticate(x_agent_token)
    return system_metrics()


@app.get("/rooms")
async def rooms(x_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    authenticate(x_agent_token)
    return await livekit_rooms()


@app.get("/logs/{service}")
def logs(
    service: str,
    x_agent_token: str | None = Header(default=None),
    lines: int = Query(default=100, ge=10, le=500),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if service not in SERVICES:
        raise HTTPException(status_code=400, detail="Invalid service")
    return {"service": service, "lines": lines, "logs": get_logs(SERVICES[service], lines)}


@app.get("/overview")
async def overview(x_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    authenticate(x_agent_token)
    return {
        "status": "online",
        "docker": docker_status(),
        "services": {service: service_status(service) for service in SERVICES},
        "metrics": system_metrics(),
        "rooms": await livekit_rooms(),
    }


@app.post("/services/{service}/restart")
def restart_service(
    service: str,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if service not in SERVICES:
        raise HTTPException(status_code=400, detail="Invalid service")
    container = SERVICES[service]
    result = run_argv(["docker", "restart", container], timeout=60)
    ok = result.returncode == 0
    audit(x_admin_actor, "container.restart", container, ok, result.stderr)
    if not ok:
        raise HTTPException(status_code=502, detail="The container did not restart")
    return {"success": True, "service": service, "container": container}


@app.get("/docker/containers")
def docker_containers(x_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    authenticate(x_agent_token)
    result = run_argv(["docker", "ps", "-a", "--format", "{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}"])
    if result.returncode != 0:
        raise HTTPException(status_code=502, detail="Docker is unavailable")
    containers = []
    for line in result.stdout.splitlines():
        parts = line.split("|")
        if len(parts) < 4:
            continue
        name = parts[0]
        containers.append(
            {
                "name": name,
                "image": parts[1],
                "status": parts[2],
                "state": parts[3],
                "running": parts[3] == "running",
                "manageable": policy.is_allowed_container(name),
            }
        )
    return {"containers": containers}


@app.get("/docker/containers/{name}/logs")
def docker_container_logs(
    name: str,
    x_agent_token: str | None = Header(default=None),
    lines: int = Query(default=150, ge=10, le=500),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if not policy.is_allowed_container(name):
        raise HTTPException(status_code=403, detail="That container is not allowed.")
    return {"container": name, "lines": lines, "logs": get_logs(name, lines)}


@app.post("/docker/containers/{name}/{action}")
def docker_container_action(
    name: str,
    action: str,
    body: ConfirmBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if action not in {"start", "stop", "restart"} or not policy.is_allowed_container(name):
        raise HTTPException(status_code=403, detail="That container action is not allowed.")
    if not policy.confirmation_matches(action, body.confirm):
        raise HTTPException(status_code=400, detail="Confirmation is required.")
    result = run_argv(["docker", action, name], timeout=60)
    ok = result.returncode == 0
    audit(x_admin_actor, f"container.{action}", name, ok, result.stderr)
    if not ok:
        raise HTTPException(status_code=502, detail=policy.public_error(result.stderr or "Docker rejected the action"))
    return {"success": True, "container": name, "action": action}


@app.get("/host")
def host(x_agent_token: str | None = Header(default=None), limit: int = Query(default=40, ge=5, le=100)) -> dict[str, Any]:
    authenticate(x_agent_token)
    metrics_data = system_metrics()
    return {
        "metrics": metrics_data,
        "interfaces": network_interfaces(),
        "services": [host_service_status(service) for service in policy.HOST_SERVICES],
        "processes": process_rows(limit),
    }


@app.get("/host/logs")
def host_logs(
    x_agent_token: str | None = Header(default=None),
    source: str = Query(default="syslog"),
    lines: int = Query(default=150, ge=10, le=400),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    target = policy.HOST_LOGS.get(source)
    if target is None:
        raise HTTPException(status_code=400, detail="That log source is not allowed.")
    if target.startswith("journal:"):
        unit = target.split(":", 1)[1]
        result = run_argv(["/usr/bin/journalctl", "-u", unit, "--no-pager", "-n", str(lines)])
        if needs_sudo(result):
            result = run_argv(["sudo", "-n", "/usr/bin/journalctl", "-u", unit, "--no-pager", "-n", str(lines)])
        if result.returncode != 0:
            raise HTTPException(status_code=502, detail="The log could not be read.")
        output = result.stdout[-30000:]
    else:
        if not os.path.isfile(target):
            raise HTTPException(status_code=404, detail="Log not found")
        output = tail_file(target, lines)
    return {"source": source, "lines": lines, "logs": output}


@app.post("/host/services/{service}/{action}")
def host_service_action(
    service: str,
    action: str,
    body: ConfirmBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if not policy.host_action_allowed(service, action):
        raise HTTPException(status_code=403, detail="That service action is not allowed.")
    if not policy.confirmation_matches(action, body.confirm):
        raise HTTPException(status_code=400, detail="Confirmation is required.")
    result = systemctl_action(action, service)
    ok = result.returncode == 0
    audit(x_admin_actor, f"service.{action}", service, ok, result.stderr)
    if not ok:
        detail = policy.public_error(result.stderr or result.stdout or "systemctl rejected the action")
        raise HTTPException(status_code=502, detail=detail or "systemctl rejected the action")
    return {"success": True, "service": service, "action": action}


@app.get("/files")
def files(path: str, x_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    authenticate(x_agent_token)
    real = real_allowed(path, write=False)
    if os.path.islink(real):
        raise HTTPException(status_code=403, detail="That path is not allowed.")
    classified = policy.classify_path(real)
    if os.path.isdir(real):
        entries = []
        try:
            names = sorted(os.listdir(real))
        except OSError as exc:
            raise HTTPException(status_code=403, detail="That directory cannot be listed.") from exc
        for name in names:
            child = os.path.join(real, name)
            if os.path.islink(child):
                continue
            try:
                child_info = policy.classify_path(child)
            except policy.PolicyError:
                continue
            kind = "dir" if os.path.isdir(child) else "file"
            entries.append(
                {
                    "name": name,
                    "kind": kind,
                    "size": os.path.getsize(child) if kind == "file" else None,
                    "writable": bool(child_info["writable"]) and kind == "file",
                    "important": bool(child_info["important"]),
                }
            )
        return {
            "path": real,
            "kind": "dir",
            "writable": policy.is_write_directory(real),
            "entries": entries,
        }

    return {
        "path": real,
        "kind": "file",
        "writable": bool(classified["writable"]),
        "important": bool(classified["important"]),
        "content": read_text(real),
    }


@app.put("/files")
def write_file(
    body: FileBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    real = real_allowed(body.path, write=True)
    classified = policy.classify_path(real)
    if classified["important"] and not policy.confirmation_matches("save", body.confirm):
        raise HTTPException(status_code=400, detail="Confirmation is required.")
    ensure_text(body.content)
    if os.path.basename(real) == "redis.conf":
        try:
            policy.validate_redis_conf(body.content)
        except policy.PolicyError as exc:
            raise policy_error(exc) from exc
    if not os.path.isfile(real) or os.path.islink(real):
        raise HTTPException(status_code=404, detail="File not found")
    existing = read_text(real)
    if existing == body.content:
        return {"success": True, "path": real, "unchanged": True}

    backup = backup_file(real)
    try:
        with open(real, "w", encoding="utf-8") as handle:
            handle.write(body.content)
        validate_written_config(real)
    except HTTPException:
        restore_backup(real, backup)
        audit(x_admin_actor, "file.write", real, False, "validation failed")
        raise
    except OSError as exc:
        restore_backup(real, backup)
        audit(x_admin_actor, "file.write", real, False, "write failed")
        raise HTTPException(status_code=500, detail="The file could not be saved.") from exc

    audit(x_admin_actor, "file.write", real, True, os.path.basename(backup))
    return {"success": True, "path": real, "backup": os.path.basename(backup)}


@app.post("/files")
def create_file(
    body: FileBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    try:
        classified = policy.classify_path(body.path)
    except policy.PolicyError as exc:
        raise policy_error(exc) from exc
    if not classified["writable"] or not policy.is_creatable_filename(os.path.basename(str(classified["path"]))):
        raise HTTPException(status_code=403, detail="That file cannot be created.")
    real = real_allowed(str(classified["path"]), write=True)
    if os.path.exists(real):
        raise HTTPException(status_code=409, detail="That file already exists.")
    ensure_text(body.content)
    parent = os.path.dirname(real)
    if not os.path.isdir(parent) or os.path.islink(parent):
        raise HTTPException(status_code=403, detail="That directory is not writable.")
    try:
        with open(real, "x", encoding="utf-8") as handle:
            handle.write(body.content)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="The file could not be created.") from exc
    audit(x_admin_actor, "file.create", real, True)
    return {"success": True, "path": real}


@app.post("/files/rename")
def rename_file(
    body: RenameBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    source = real_allowed(body.path, write=True)
    try:
        destination_info = policy.classify_path(body.to)
    except policy.PolicyError as exc:
        raise policy_error(exc) from exc
    if not destination_info["writable"] or not policy.is_writable_filename(os.path.basename(str(destination_info["path"]))):
        raise HTTPException(status_code=403, detail="That name is not allowed.")
    destination = real_allowed(str(destination_info["path"]), write=True)
    source_info = policy.classify_path(source)
    if (source_info["important"] or destination_info["important"]) and not policy.confirmation_matches("save", body.confirm):
        raise HTTPException(status_code=400, detail="Confirmation is required.")
    if os.path.exists(destination):
        raise HTTPException(status_code=409, detail="That file already exists.")
    if not os.path.isfile(source) or os.path.islink(source):
        raise HTTPException(status_code=404, detail="File not found")
    os.rename(source, destination)
    audit(x_admin_actor, "file.rename", f"{source} -> {destination}", True)
    return {"success": True, "path": destination}


@app.delete("/files")
def delete_file(
    body: DeleteBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if not policy.confirmation_matches("delete", body.confirm):
        raise HTTPException(status_code=400, detail="Confirmation is required.")
    real = real_allowed(body.path, write=True)
    if not os.path.isfile(real) or os.path.islink(real):
        raise HTTPException(status_code=404, detail="File not found")
    backup = backup_file(real)
    os.remove(real)
    audit(x_admin_actor, "file.delete", real, True, os.path.basename(backup))
    return {"success": True, "path": real, "backup": os.path.basename(backup)}


@app.post("/system/reboot")
def reboot(
    body: ConfirmBody,
    x_agent_token: str | None = Header(default=None),
    x_admin_actor: str | None = Header(default=None),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if not policy.confirmation_matches("reboot", body.confirm):
        raise HTTPException(status_code=400, detail="Confirmation is required.")
    audit(x_admin_actor, "system.reboot", "vps", True)
    result = run_argv(["sudo", "-n", "/usr/sbin/reboot"], timeout=15)
    if result.returncode != 0:
        audit(x_admin_actor, "system.reboot", "vps", False, result.stderr)
        raise HTTPException(
            status_code=502,
            detail=policy.public_error(result.stderr or "Reboot was not accepted"),
        )
    return {"success": True}


@app.get("/audit")
def read_audit(
    x_agent_token: str | None = Header(default=None),
    lines: int = Query(default=80, ge=1, le=200),
) -> dict[str, Any]:
    authenticate(x_agent_token)
    if not os.path.isfile(AUDIT_PATH):
        return {"events": []}
    output = tail_file(AUDIT_PATH, lines)
    events = []
    for line in output.splitlines():
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(item, dict):
            events.append(
                {
                    "ts": str(item.get("ts", "")),
                    "actor": str(item.get("actor", "")),
                    "action": str(item.get("action", "")),
                    "target": str(item.get("target", "")),
                    "ok": bool(item.get("ok")),
                    "detail": str(item.get("detail", ""))[:300],
                }
            )
    return {"events": events}
