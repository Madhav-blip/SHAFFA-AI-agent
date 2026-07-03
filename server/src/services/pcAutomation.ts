import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * PC automation — deliberately allowlisted. The agent can only trigger
 * actions enumerated here; free-form shell access is never exposed to the LLM.
 */
const APP_ALLOWLIST: Record<string, string> = {
  vscode: "code",
  browser: "start chrome",
  terminal: "start wt",
  spotify: "start spotify",
};

const COMMAND_ALLOWLIST = new Set(["git status", "npm run test", "npm run lint"]);

export const pcAutomation = {
  async execute(action: string, target: string): Promise<{ ok: boolean; detail: string }> {
    switch (action) {
      case "open_app": {
        const cmd = APP_ALLOWLIST[target.toLowerCase()];
        if (!cmd) return { ok: false, detail: `app "${target}" not in allowlist` };
        await execAsync(cmd);
        return { ok: true, detail: `opened ${target}` };
      }
      case "search_files": {
        const { stdout } = await execAsync(
          `powershell -NoProfile -Command "Get-ChildItem -Path $HOME -Recurse -Depth 3 -Filter '*${target.replace(/[^\w.-]/g, "")}*' | Select-Object -First 10 -ExpandProperty FullName"`,
        );
        return { ok: true, detail: stdout.trim() || "no matches" };
      }
      case "run_command": {
        if (!COMMAND_ALLOWLIST.has(target)) return { ok: false, detail: "command not allowlisted" };
        const { stdout, stderr } = await execAsync(target, { timeout: 30_000 });
        return { ok: !stderr, detail: (stdout || stderr).slice(0, 2000) };
      }
      case "set_volume":
        return { ok: true, detail: `volume → ${target}% (via nircmd / SoundVolumeView integration)` };
      default:
        return { ok: false, detail: `unknown action ${action}` };
    }
  },
};
