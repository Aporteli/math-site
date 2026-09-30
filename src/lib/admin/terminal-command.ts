import { isAllowedContainerName, isTerminalPath } from '@/lib/admin/vps-policy';

const MAX_INPUT_LENGTH = 400;
const MAX_OUTPUT_CHARS = 64_000;

const ALLOWED_SUMMARY =
  'Allowed commands: docker ps, docker logs, ls, cat, grep, pip show, systemctl status.';

export type ParsedTerminalCommand = {
  argv: string[];
};

export type TerminalCommandResult =
  | { ok: true; command: ParsedTerminalCommand }
  | { ok: false; error: string };

function fail(error: string): TerminalCommandResult {
  return { ok: false, error };
}

function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const char of input) {
    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      if (char === '\n' || char === '\r' || char === '\\' || char === '$' || char === '`') {
        return null;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ' ' || char === '\t') {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    if (/[;&|$`<>(){}!\n\r\\]/.test(char)) {
      return null;
    }

    current += char;
  }

  if (quote) return null;
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function isSafePath(path: string): boolean {
  return isTerminalPath(path);
}

function isBoundedInt(value: string, max: number): boolean {
  if (!/^[0-9]{1,6}$/.test(value)) return false;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= max;
}

function isPackageName(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(value);
}

function isContainerName(value: string): boolean {
  return isAllowedContainerName(value);
}

function isGrepPattern(value: string): boolean {
  return /^[\w .:@/+*=,[\]]{1,200}$/.test(value);
}

function parseDockerPs(args: string[]): TerminalCommandResult {
  const argv = ['docker', 'ps'];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';

    if (arg === '-a' || arg === '--all' || arg === '-q' || arg === '--quiet' || arg === '--no-trunc') {
      argv.push(arg);
      continue;
    }

    if (arg === '-n' || arg === '--last') {
      const value = args[index + 1];
      if (!value || !isBoundedInt(value, 100)) {
        return fail('docker ps -n accepts a count from 1 to 100.');
      }
      argv.push(arg, value);
      index += 1;
      continue;
    }

    if (arg === '--format') {
      const value = args[index + 1];
      if (!value || !/^[\w{} .:|,()/-]{1,120}$/.test(value)) {
        return fail('That docker ps --format value is not allowed.');
      }
      argv.push(arg, value);
      index += 1;
      continue;
    }

    if (arg === '--filter') {
      const value = args[index + 1];
      if (!value || !/^[A-Za-z0-9_.=:/-]{1,120}$/.test(value)) {
        return fail('That docker ps --filter value is not allowed.');
      }
      argv.push(arg, value);
      index += 1;
      continue;
    }

    return fail(ALLOWED_SUMMARY);
  }

  return { ok: true, command: { argv } };
}

function parseDockerLogs(args: string[]): TerminalCommandResult {
  const argv = ['docker', 'logs'];
  const positionals: string[] = [];
  let hasTail = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';

    if (arg === '-f' || arg === '--follow') {
      return fail('docker logs follow mode is not allowed.');
    }

    if (arg === '-t' || arg === '--timestamps' || arg === '--details') {
      argv.push(arg);
      continue;
    }

    if (arg === '--tail' || arg === '-n') {
      const value = args[index + 1];
      if (!value || !isBoundedInt(value, 500)) {
        return fail('docker logs --tail accepts a count from 1 to 500.');
      }
      argv.push('--tail', value);
      hasTail = true;
      index += 1;
      continue;
    }

    if (arg.startsWith('--tail=')) {
      const value = arg.slice('--tail='.length);
      if (!isBoundedInt(value, 500)) {
        return fail('docker logs --tail accepts a count from 1 to 500.');
      }
      argv.push('--tail', value);
      hasTail = true;
      continue;
    }

    if (arg === '--since' || arg === '--until') {
      const value = args[index + 1];
      if (!value || !/^[0-9]{1,6}[smhd]$|^[0-9T:Z.+-]{1,32}$/.test(value)) {
        return fail(`That docker logs ${arg} value is not allowed.`);
      }
      argv.push(arg, value);
      index += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      return fail(ALLOWED_SUMMARY);
    }

    positionals.push(arg);
  }

  if (positionals.length !== 1 || !isContainerName(positionals[0] ?? '')) {
    return fail('docker logs needs one container name.');
  }

  if (!hasTail) {
    argv.push('--tail', '200');
  }

  argv.push(positionals[0] ?? '');
  return { ok: true, command: { argv } };
}

function parseLs(args: string[]): TerminalCommandResult {
  const argv = ['ls'];

  for (const arg of args) {
    if (arg === '--all' || arg === '--human-readable') {
      argv.push(arg);
      continue;
    }

    if (/^-[lah1]+$/.test(arg)) {
      argv.push(arg);
      continue;
    }

    if (arg.startsWith('-') || !isSafePath(arg)) {
      return fail(ALLOWED_SUMMARY);
    }

    argv.push(arg);
  }

  return { ok: true, command: { argv } };
}

function parseCat(args: string[]): TerminalCommandResult {
  if (args.length < 1 || args.length > 5) {
    return fail('cat needs one to five file paths.');
  }

  if (args.some((arg) => arg.startsWith('-') || !isSafePath(arg))) {
    return fail(ALLOWED_SUMMARY);
  }

  return { ok: true, command: { argv: ['cat', ...args] } };
}

function parseGrep(args: string[]): TerminalCommandResult {
  const argv = ['grep'];
  const positionals: string[] = [];
  let pattern: string | null = null;
  let recursive = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';

    if (
      arg === '-n' ||
      arg === '-i' ||
      arg === '-H' ||
      arg === '-l' ||
      arg === '-w' ||
      arg === '-c' ||
      arg === '--line-number' ||
      arg === '--ignore-case'
    ) {
      argv.push(arg);
      continue;
    }

    if (arg === '-r' || arg === '-R' || arg === '--recursive') {
      recursive = true;
      argv.push(arg);
      continue;
    }

    if (arg === '-m' || arg === '--max-count') {
      const value = args[index + 1];
      if (!value || !isBoundedInt(value, 200)) {
        return fail('grep -m accepts a count from 1 to 200.');
      }
      argv.push('-m', value);
      index += 1;
      continue;
    }

    if (arg === '-e' || arg === '--regexp') {
      const value = args[index + 1];
      if (!value || !isGrepPattern(value)) {
        return fail('That grep pattern is not allowed.');
      }
      pattern = value;
      argv.push('-e', value);
      index += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      return fail(ALLOWED_SUMMARY);
    }

    positionals.push(arg);
  }

  if (!pattern) {
    const first = positionals.shift();
    if (!first || !isGrepPattern(first)) {
      return fail('grep needs a pattern and at least one path.');
    }
    pattern = first;
    argv.push(pattern);
  }

  if (positionals.length < 1 || positionals.length > 5) {
    return fail('grep needs a pattern and one to five paths.');
  }

  if (positionals.some((path) => !isSafePath(path))) {
    return fail(ALLOWED_SUMMARY);
  }

  if (recursive && positionals.some((path) => path === '/')) {
    return fail('Recursive grep of / is not allowed.');
  }

  argv.push(...positionals);
  return { ok: true, command: { argv } };
}

function isPipProgram(program: string): boolean {
  if (program === 'pip' || program === 'pip3') return true;
  if (!program.includes('/') || !isSafePath(program)) return false;
  const base = program.split('/').pop()?.toLowerCase() ?? '';
  return base === 'pip' || base === 'pip3';
}

function parsePip(program: string, args: string[]): TerminalCommandResult {
  if (args[0] !== 'show' || args.length !== 2 || !isPackageName(args[1] ?? '')) {
    return fail('Only pip show <package> is allowed.');
  }

  return { ok: true, command: { argv: [program, 'show', args[1] ?? ''] } };
}

function isUnitName(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9@._-]{0,80}$/.test(value);
}

function parseSystemctl(args: string[]): TerminalCommandResult {
  if (args[0] !== 'status') {
    return fail('Only systemctl status is allowed.');
  }

  const flags: string[] = [];
  const units: string[] = [];
  let hasNoPager = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index] ?? '';

    if (arg === '--no-pager') {
      hasNoPager = true;
      continue;
    }

    if (arg === '-l' || arg === '--full' || arg === '--no-legend') {
      flags.push(arg);
      continue;
    }

    if (arg === '-n' || arg === '--lines') {
      const value = args[index + 1];
      if (!value || !isBoundedInt(value, 200)) {
        return fail('systemctl status -n accepts a count from 1 to 200.');
      }
      flags.push('--lines', value);
      index += 1;
      continue;
    }

    if (arg.startsWith('-') || !isUnitName(arg)) {
      return fail(ALLOWED_SUMMARY);
    }

    units.push(arg);
  }

  if (units.length > 3) {
    return fail(ALLOWED_SUMMARY);
  }

  return {
    ok: true,
    command: {
      argv: ['systemctl', ...(hasNoPager ? [] : ['--no-pager']), 'status', ...flags, ...units],
    },
  };
}

export function parseTerminalCommand(input: string): TerminalCommandResult {
  const command = input.trim();

  if (command.length === 0) {
    return fail('Enter a command.');
  }

  if (command.length > MAX_INPUT_LENGTH) {
    return fail('That command is too long.');
  }

  const tokens = tokenize(command);
  if (!tokens || tokens.length === 0 || tokens.length > 12) {
    return fail(ALLOWED_SUMMARY);
  }

  const [program, ...args] = tokens;

  if (program === 'docker') {
    if (args[0] === 'ps') return parseDockerPs(args.slice(1));
    if (args[0] === 'logs') return parseDockerLogs(args.slice(1));
    return fail(ALLOWED_SUMMARY);
  }

  if (program === 'ls') return parseLs(args);
  if (program === 'cat') return parseCat(args);
  if (program === 'grep') return parseGrep(args);
  if (isPipProgram(program)) return parsePip(program, args);
  if (program === 'systemctl') return parseSystemctl(args);

  return fail(ALLOWED_SUMMARY);
}

export function clampTerminalOutput(value: string): string {
  if (value.length <= MAX_OUTPUT_CHARS) return value;
  return `${value.slice(0, MAX_OUTPUT_CHARS)}\n… output truncated`;
}
