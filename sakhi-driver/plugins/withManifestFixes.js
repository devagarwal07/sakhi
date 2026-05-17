const { withAndroidManifest } = require('@expo/config-plugins');

function withManifestFixes(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults.manifest;
    
    // Ensure the tools namespace is present
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = androidManifest.application[0];
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }
    
    // ── Fix 1: Add tools:replace to Firebase meta-data to resolve merger conflicts ──
    const itemsToReplace = [
      { name: 'com.google.firebase.messaging.default_notification_channel_id', value: 'default' },
      { name: 'com.google.firebase.messaging.default_notification_color', resource: '@color/notification_icon_color' }
    ];

    for (const target of itemsToReplace) {
      let item = application['meta-data'].find(i => i.$['android:name'] === target.name);
      if (!item) {
        console.log(`Adding missing meta-data: ${target.name}`);
        item = { $: { 'android:name': target.name } };
        if (target.value) item.$['android:value'] = target.value;
        if (target.resource) item.$['android:resource'] = target.resource;
        application['meta-data'].push(item);
      }
      
      const replaceAttr = target.value ? 'android:value' : 'android:resource';
      item.$['tools:replace'] = item.$['tools:replace'] 
        ? (item.$['tools:replace'].includes(replaceAttr) ? item.$['tools:replace'] : `${item.$['tools:replace']},${replaceAttr}`)
        : replaceAttr;
    }

    // ── Fix 2: Add showWhenLocked + turnScreenOn to MainActivity ──────────────────
    // These attributes allow the full-screen notification to appear on the lock screen
    // and wake the display, exactly like Uber/Ola incoming ride screens do.
    const activities = application.activity || [];
    const mainActivity = activities.find(a => a.$['android:name'] === '.MainActivity');
    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      console.log('Applied showWhenLocked + turnScreenOn to MainActivity');
    } else {
      console.warn('MainActivity not found in manifest — could not apply showWhenLocked');
    }

    return config;
  });
}

module.exports = withManifestFixes;

