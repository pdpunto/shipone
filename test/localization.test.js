const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("LocalizationService usa fallback cuando falta la traduccion", () => {
  const originalLoad = Module._load;

  try {
    Module._load = function patchedLoad(request, parent, isMain) {
      if (request === "vscode") {
        return {
          l10n: {
            t: () => "",
          },
        };
      }

      return originalLoad.call(this, request, parent, isMain);
    };

    delete require.cache[require.resolve("../out/localization/localizationService")];
    const { LocalizationService } = require("../out/localization/localizationService");
    const service = new LocalizationService();

    assert.equal(
      service.translate("Hola {0}", "ShipOne"),
      "Hola ShipOne"
    );
  } finally {
    Module._load = originalLoad;
  }
});
