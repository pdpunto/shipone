const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("onboarding abre el README cuando se elige la guia rapida", async () => {
  const originalLoad = Module._load;
  const calls = [];
  const updateCalls = [];

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: (value, ...args) =>
              value.replace(/\{(\d+)\}/g, (_, index) => String(args[Number(index)] ?? "")),
          },
          Uri: {
            file: (value) => ({ fsPath: value }),
            joinPath: (base, ...parts) => ({
              fsPath: require("node:path").win32.join(base.fsPath, ...parts),
            }),
          },
          window: {
            showInformationMessage: async (...args) => {
              calls.push({ type: "message", args });
              return args[3];
            },
          },
          commands: {
            executeCommand: async (name, ...args) => {
              calls.push({ type: "command", name, args });
            },
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/onboarding/showFirstRunOnboarding")];
    const { showFirstRunOnboarding } = require("../out/onboarding/showFirstRunOnboarding");

    await showFirstRunOnboarding(
      {
        extensionUri: { fsPath: "C:\\ext" },
        globalState: {
          get: () => false,
          update: async (...args) => {
            updateCalls.push(args);
          },
        },
      },
      {
        getSettings: () => ({ projectsRoot: "C:\\shipone" }),
      }
    );

    const commandCall = calls.find((call) => call.type === "command");
    assert.ok(commandCall);
    assert.equal(commandCall.name, "vscode.open");
    assert.equal(commandCall.args[0].fsPath, "C:\\ext\\README.md");
    assert.equal(updateCalls.length, 1);
    assert.deepEqual(updateCalls[0], ["shipone.firstRunSeen", true]);
  } finally {
    Module._load = originalLoad;
  }
});

test("onboarding no marca visto si se cancela", async () => {
  const originalLoad = Module._load;
  const updateCalls = [];

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: (value, ...args) =>
              value.replace(/\{(\d+)\}/g, (_, index) => String(args[Number(index)] ?? "")),
          },
          Uri: {
            file: (value) => ({ fsPath: value }),
            joinPath: (base, ...parts) => ({
              fsPath: require("node:path").win32.join(base.fsPath, ...parts),
            }),
          },
          window: {
            showInformationMessage: async () => undefined,
          },
          commands: {
            executeCommand: async () => {
              throw new Error("no se esperaba ejecutar comandos");
            },
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/onboarding/showFirstRunOnboarding")];
    const { showFirstRunOnboarding } = require("../out/onboarding/showFirstRunOnboarding");

    await showFirstRunOnboarding(
      {
        extensionUri: { fsPath: "C:\\ext" },
        globalState: {
          get: () => false,
          update: async (...args) => {
            updateCalls.push(args);
          },
        },
      },
      {
        getSettings: () => ({ projectsRoot: "C:\\shipone" }),
      }
    );

    assert.equal(updateCalls.length, 0);
  } finally {
    Module._load = originalLoad;
  }
});
