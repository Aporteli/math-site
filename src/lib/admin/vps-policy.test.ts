import assert from 'node:assert/strict';
import { parseTerminalCommand } from './terminal-command';
import { classifyPath, isTerminalPath } from './vps-policy';

assert.equal(parseTerminalCommand('docker ps').ok, true);
assert.equal(parseTerminalCommand('docker logs --tail 100 livekitpinfcomge-livekit-1').ok, true);
assert.equal(parseTerminalCommand('ls -la /opt/livekit/livekit.pinf.com.ge').ok, true);
assert.equal(parseTerminalCommand('systemctl status docker --no-pager').ok, true);

assert.equal(parseTerminalCommand('docker logs --tail 100 nginx').ok, false);
assert.equal(parseTerminalCommand('cat /opt/livekit/livekit.pinf.com.ge/livekit.yaml').ok, false);
assert.equal(parseTerminalCommand('cat /opt/livekit-admin-agent/.env').ok, false);
assert.equal(parseTerminalCommand('cat /etc/passwd').ok, false);
assert.equal(parseTerminalCommand('rm -rf /').ok, false);
assert.equal(parseTerminalCommand('docker ps; cat /etc/shadow').ok, false);
assert.equal(isTerminalPath('/var/log/syslog'), true);
assert.equal(isTerminalPath('/var/log/auth.log'), false);

const config = classifyPath('/opt/livekit/livekit.pinf.com.ge/caddy.yaml');
assert.equal(config.ok, true);
if (config.ok) {
  assert.equal(config.path.writable, true);
  assert.equal(config.path.important, true);
}
assert.equal(classifyPath('/opt/livekit/livekit.pinf.com.ge/../etc/passwd').ok, false);

console.log('vps policy tests passed');
