import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const COMMANDS = Object.freeze({
  whoami: ["/usr/bin/whoami", []],
  hostname: ["/bin/hostname", []],
  uptime: ["/usr/bin/uptime", []],
  memory: ["/usr/bin/free", ["-h"]],
  disk: ["/bin/df", ["-h", "/"]],
  processes: ["/bin/ps", ["-eo", "pid,comm,%cpu,%mem", "--sort=-%cpu"]],
  node: [process.execPath, ["--version"]],
  os: ["/bin/uname", ["-a"]],
  date: ["/bin/date", ["-Is"]],
  pwd: ["/bin/pwd", []]
});

export async function executeServerDiagnostic(command) {
  if (typeof command !== "string" || command.length > 40 || !/^[a-z]+$/.test(command)) {
    throw new Error("Invalid command. Type help to see the supported diagnostics.");
  }
  if (command === "help") {
    return { command, output: "Available read-only diagnostics:\n" + Object.keys(COMMANDS).join("  ") + "\nclear (clears this browser window)" };
  }
  const spec = COMMANDS[command];
  if (!spec) throw new Error("Command is not allowed. Type help to see the supported diagnostics.");
  const [file, args] = spec;
  const { stdout, stderr } = await execFileAsync(file, args, { timeout: 5000, maxBuffer: 16 * 1024, windowsHide: true });
  const output = String(stdout || stderr || "(no output)").slice(0, 12000);
  return { command, output };
}
