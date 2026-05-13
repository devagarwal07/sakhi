const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const PLUGIN_NAME = "withAdiRegistration";

function withAdiRegistration(config) {
  return withDangerousMod(config, ["android", async (modConfig) => {
    const projectRoot = modConfig.modRequest.projectRoot;
    const platformProjectRoot = modConfig.modRequest.platformProjectRoot;
    const sourceFile = path.join(projectRoot, "assets", "adi-registration.properties");
    const assetsDir = path.join(platformProjectRoot, "app", "src", "main", "assets");
    const targetFile = path.join(assetsDir, "adi-registration.properties");

    if (!fs.existsSync(sourceFile)) {
      throw new Error(`${PLUGIN_NAME}: missing ${sourceFile}`);
    }

    fs.mkdirSync(assetsDir, { recursive: true });
    fs.copyFileSync(sourceFile, targetFile);

    return modConfig;
  }]);
}

module.exports = withAdiRegistration;
