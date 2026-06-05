const { withProjectBuildGradle } = require("@expo/config-plugins");

function withPhonePeMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      let content = config.modResults.contents;
      const mavenRepo = "maven { url 'https://phonepe.mycloudrepo.io/public/repositories/phonepe-intentsdk-android' }";
      
      if (!content.includes(mavenRepo)) {
        // Find the repositories block inside allprojects
        content = content.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          `allprojects {\n  repositories {\n    ${mavenRepo}`
        );
        config.modResults.contents = content;
      }
    }
    return config;
  });
}

module.exports = withPhonePeMaven;
