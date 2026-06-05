const { withAndroidManifest } = require("@expo/config-plugins");

function withUpiQueries(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Ensure manifest.queries exists as an array
    if (!androidManifest.manifest.queries) {
      androidManifest.manifest.queries = [];
    }

    // Define our UPI queries structure
    const upiQueries = {
      intent: [
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          category: [{ $: { "android:name": "android.intent.category.BROWSABLE" } }],
          data: [{ $: { "android:scheme": "https" } }]
        },
        {
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          data: [{ $: { "android:scheme": "upi" } }]
        }
      ],
      package: [
        { $: { "android:name": "com.phonepe.app" } },
        { $: { "android:name": "com.google.android.apps.nbu.paisa.user" } },
        { $: { "android:name": "net.one97.paytm" } },
        { $: { "android:name": "in.org.npci.upiapp" } },
        { $: { "android:name": "com.phonepe.app.b2b" } }
      ]
    };

    // Find if there is an existing queries element or create one
    let queriesElement = androidManifest.manifest.queries[0];
    if (!queriesElement) {
      queriesElement = {};
      androidManifest.manifest.queries.push(queriesElement);
    }

    // Merge intents safely to avoid duplicates
    if (!queriesElement.intent) {
      queriesElement.intent = [];
    }
    upiQueries.intent.forEach(newIntent => {
      const exists = queriesElement.intent.some(existingIntent => {
        const existingAction = existingIntent.action?.[0]?.$?.["android:name"];
        const newAction = newIntent.action?.[0]?.$?.["android:name"];
        const existingScheme = existingIntent.data?.[0]?.$?.["android:scheme"];
        const newScheme = newIntent.data?.[0]?.$?.["android:scheme"];
        return existingAction === newAction && existingScheme === newScheme;
      });
      if (!exists) {
        queriesElement.intent.push(newIntent);
      }
    });

    // Merge packages safely to avoid duplicates
    if (!queriesElement.package) {
      queriesElement.package = [];
    }
    upiQueries.package.forEach(newPackage => {
      const exists = queriesElement.package.some(existingPackage => {
        return existingPackage?.$?.["android:name"] === newPackage?.$?.["android:name"];
      });
      if (!exists) {
        queriesElement.package.push(newPackage);
      }
    });

    return config;
  });
}

module.exports = withUpiQueries;
