/* eslint-disable */
'use strict';

const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAndroidManifest, withAndroidStyles } = require('@expo/config-plugins');

// --------------------------------------------------------------------------
// Kotlin source templates (plain strings — no template literals to avoid
// escaping issues in config plugin loaders)
// --------------------------------------------------------------------------

function makeIncomingRideActivity(pkg) {
  return (
    'package ' + pkg + '\n\n' +
    'import android.app.Activity\n' +
    'import android.app.KeyguardManager\n' +
    'import android.content.Context\n' +
    'import android.content.Intent\n' +
    'import android.os.Build\n' +
    'import android.os.Bundle\n' +
    'import android.view.WindowManager\n\n' +
    'class IncomingRideActivity : Activity() {\n' +
    '    override fun onCreate(savedInstanceState: Bundle?) {\n' +
    '        super.onCreate(savedInstanceState)\n\n' +
    '        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {\n' +
    '            setShowWhenLocked(true)\n' +
    '            setTurnScreenOn(true)\n' +
    '        } else {\n' +
    '            @Suppress("DEPRECATION")\n' +
    '            window.addFlags(\n' +
    '                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or\n' +
    '                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or\n' +
    '                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON\n' +
    '            )\n' +
    '        }\n\n' +
    '        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n' +
    '            val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager\n' +
    '            km.requestDismissKeyguard(this, null)\n' +
    '        }\n\n' +
    '        val extras = intent?.extras\n' +
    '        if (extras != null) {\n' +
    '            val prefs = getSharedPreferences("SakhiRideBridge", Context.MODE_PRIVATE)\n' +
    '            val editor = prefs.edit()\n' +
    '            for (key in extras.keySet()) {\n' +
    '                val v = extras.get(key)\n' +
    '                if (v != null) editor.putString(key, v.toString())\n' +
    '            }\n' +
    '            val pressActionId = extras.getString("pressAction.id")\n' +
    '                ?: extras.getString("notifee.pressAction.id")\n' +
    '            if (pressActionId == "accept") editor.putString("_action", "accept")\n' +
    '            editor.putString("_bridgeTimestamp", System.currentTimeMillis().toString())\n' +
    '            editor.apply()\n' +
    '        }\n\n' +
    '        val mainIntent = Intent(this, MainActivity::class.java).apply {\n' +
    '            addFlags(\n' +
    '                Intent.FLAG_ACTIVITY_NEW_TASK or\n' +
    '                Intent.FLAG_ACTIVITY_SINGLE_TOP or\n' +
    '                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT\n' +
    '            )\n' +
    '            putExtra("INCOMING_RIDE_BRIDGE", true)\n' +
    '        }\n' +
    '        startActivity(mainIntent)\n' +
    '        finish()\n' +
    '    }\n' +
    '}\n'
  );
}

function makeBridgeModule(pkg) {
  return (
    'package ' + pkg + '\n\n' +
    'import android.content.Context\n' +
    'import com.facebook.react.bridge.ReactApplicationContext\n' +
    'import com.facebook.react.bridge.ReactContextBaseJavaModule\n' +
    'import com.facebook.react.bridge.ReactMethod\n' +
    'import com.facebook.react.bridge.Promise\n' +
    'import com.facebook.react.bridge.WritableMap\n' +
    'import com.facebook.react.bridge.Arguments\n\n' +
    'class RideRequestBridgeModule(reactContext: ReactApplicationContext) :\n' +
    '    ReactContextBaseJavaModule(reactContext) {\n\n' +
    '    override fun getName(): String = "RideRequestBridge"\n\n' +
    '    @ReactMethod\n' +
    '    fun getPendingRideRequest(promise: Promise) {\n' +
    '        try {\n' +
    '            val prefs = reactApplicationContext.getSharedPreferences(\n' +
    '                "SakhiRideBridge", Context.MODE_PRIVATE\n' +
    '            )\n' +
    '            val timestamp = prefs.getString("_bridgeTimestamp", null)\n' +
    '            if (timestamp == null) { promise.resolve(null); return }\n' +
    '            val map: WritableMap = Arguments.createMap()\n' +
    '            for ((key, value) in prefs.all) {\n' +
    '                map.putString(key, value?.toString() ?: "")\n' +
    '            }\n' +
    '            prefs.edit().clear().apply()\n' +
    '            promise.resolve(map)\n' +
    '        } catch (e: Exception) {\n' +
    '            promise.reject("BRIDGE_ERROR", e.message, e)\n' +
    '        }\n' +
    '    }\n\n' +
    '    @ReactMethod\n' +
    '    fun clearPendingRideRequest(promise: Promise) {\n' +
    '        try {\n' +
    '            reactApplicationContext\n' +
    '                .getSharedPreferences("SakhiRideBridge", Context.MODE_PRIVATE)\n' +
    '                .edit().clear().apply()\n' +
    '            promise.resolve(null)\n' +
    '        } catch (e: Exception) {\n' +
    '            promise.reject("BRIDGE_ERROR", e.message, e)\n' +
    '        }\n' +
    '    }\n\n' +
    '    @ReactMethod\n' +
    '    fun canDrawOverlays(promise: Promise) {\n' +
    '        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {\n' +
    '            promise.resolve(android.provider.Settings.canDrawOverlays(reactApplicationContext))\n' +
    '        } else {\n' +
    '            promise.resolve(true)\n' +
    '        }\n' +
    '    }\n\n' +
    '    @ReactMethod\n' +
    '    fun requestOverlayPermission(promise: Promise) {\n' +
    '        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {\n' +
    '            val intent = android.content.Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION)\n' +
    '            intent.data = android.net.Uri.parse("package:" + reactApplicationContext.packageName)\n' +
    '            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)\n' +
    '            reactApplicationContext.startActivity(intent)\n' +
    '            promise.resolve(true)\n' +
    '        } else {\n' +
    '            promise.resolve(true)\n' +
    '        }\n' +
    '    }\n\n' +
    '    @ReactMethod\n' +
    '    fun showIncomingRide(data: String, promise: Promise) {\n' +
    '        try {\n' +
    '            // Save to SharedPreferences so the app picks it up when it opens\n' +
    '            val prefs = reactApplicationContext.getSharedPreferences("SakhiRideBridge", Context.MODE_PRIVATE)\n' +
    '            val editor = prefs.edit()\n' +
    '            // Convert JSON string back to Map\n' +
    '            val jsonObject = org.json.JSONObject(data)\n' +
    '            val keys = jsonObject.keys()\n' +
    '            while (keys.hasNext()) {\n' +
    '                val key = keys.next()\n' +
    '                editor.putString(key, jsonObject.getString(key))\n' +
    '            }\n' +
    '            editor.putString("_bridgeTimestamp", System.currentTimeMillis().toString())\n' +
    '            editor.apply()\n\n' +
    '            // Launch the trampoline activity\n' +
    '            val intent = android.content.Intent(reactApplicationContext, IncomingRideActivity::class.java)\n' +
    '            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP)\n' +
    '            reactApplicationContext.startActivity(intent)\n' +
    '            promise.resolve(true)\n' +
    '        } catch (e: Exception) {\n' +
    '            promise.reject("LAUNCH_ERROR", e.message, e)\n' +
    '        }\n' +
    '    }\n' +
    '}\n'
  );
}

function makeBridgePackage(pkg) {
  return (
    'package ' + pkg + '\n\n' +
    'import com.facebook.react.ReactPackage\n' +
    'import com.facebook.react.bridge.NativeModule\n' +
    'import com.facebook.react.bridge.ReactApplicationContext\n' +
    'import com.facebook.react.uimanager.ViewManager\n\n' +
    'class RideRequestBridgePackage : ReactPackage {\n' +
    '    override fun createNativeModules(\n' +
    '        reactContext: ReactApplicationContext\n' +
    '    ): List<NativeModule> = listOf(RideRequestBridgeModule(reactContext))\n\n' +
    '    override fun createViewManagers(\n' +
    '        reactContext: ReactApplicationContext\n' +
    '    ): List<ViewManager<*, *>> = emptyList()\n' +
    '}\n'
  );
}

// --------------------------------------------------------------------------
// Step 1 — Write Kotlin files + patch MainApplication.kt
// --------------------------------------------------------------------------
function withNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async function (config) {
      var pkg = (config.android && config.android.package) ? config.android.package : 'com.sakhi.partner.driver';
      var platformRoot = config.modRequest.platformProjectRoot;
      var pkgPath = pkg.split('.').join('/');
      var targetDir = path.join(platformRoot, 'app', 'src', 'main', 'java', pkgPath);

      fs.mkdirSync(targetDir, { recursive: true });

      fs.writeFileSync(path.join(targetDir, 'IncomingRideActivity.kt'),    makeIncomingRideActivity(pkg), 'utf-8');
      fs.writeFileSync(path.join(targetDir, 'RideRequestBridgeModule.kt'), makeBridgeModule(pkg),         'utf-8');
      fs.writeFileSync(path.join(targetDir, 'RideRequestBridgePackage.kt'),makeBridgePackage(pkg),        'utf-8');

      // Patch MainApplication.kt — add our package to getPackages()
      var mainAppPath = path.join(targetDir, 'MainApplication.kt');
      if (fs.existsSync(mainAppPath)) {
        var src = fs.readFileSync(mainAppPath, 'utf-8');
        if (!src.includes('RideRequestBridgePackage()')) {
          var marker = 'PackageList(this).packages.apply {';
          if (src.includes(marker)) {
            src = src.replace(
              marker,
              marker + '\n              add(RideRequestBridgePackage())'
            );
            fs.writeFileSync(mainAppPath, src, 'utf-8');
            console.log('[withRideRequestBridge] Injected RideRequestBridgePackage into MainApplication.kt');
          } else {
            console.warn('[withRideRequestBridge] WARNING: Could not find injection point in MainApplication.kt');
          }
        }
      } else {
        console.warn('[withRideRequestBridge] WARNING: MainApplication.kt not found at ' + mainAppPath);
      }

      return config;
    },
  ]);
}

// --------------------------------------------------------------------------
// Step 2 — Add Theme.IncomingRide to styles.xml
// --------------------------------------------------------------------------
function withCustomStyles(config) {
  return withAndroidStyles(config, async function (config) {
    var styles = config.modResults;
    if (!styles.resources.style) styles.resources.style = [];

    var already = styles.resources.style.find(function (s) {
      return s.$ && s.$.name === 'Theme.IncomingRide';
    });

    if (!already) {
      styles.resources.style.push({
        $: {
          name: 'Theme.IncomingRide',
          parent: '@android:style/Theme.Translucent.NoTitleBar',
        },
        item: [
          { $: { name: 'android:windowBackground' },       _: '@android:color/transparent' },
          { $: { name: 'android:windowIsTranslucent' },    _: 'true' },
          { $: { name: 'android:windowNoTitle' },           _: 'true' },
          { $: { name: 'android:windowAnimationStyle' },    _: '@null' },
        ],
      });
    }
    return config;
  });
}

// --------------------------------------------------------------------------
// Step 3 — Register IncomingRideActivity in AndroidManifest.xml
// --------------------------------------------------------------------------
function withCustomManifest(config) {
  return withAndroidManifest(config, async function (config) {
    var pkg = (config.android && config.android.package) ? config.android.package : 'com.sakhi.partner.driver';
    var manifest = config.modResults.manifest;
    var application = manifest.application[0];

    if (!application.activity) application.activity = [];

    var already = application.activity.find(function (a) {
      return a.$ && a.$['android:name'] === '.IncomingRideActivity';
    });

    if (!already) {
      application.activity.push({
        $: {
          'android:name':              '.IncomingRideActivity',
          'android:theme':             '@style/Theme.IncomingRide',
          'android:launchMode':        'singleInstance',
          'android:exported':          'true',
          'android:showWhenLocked':    'true',
          'android:turnScreenOn':      'true',
          'android:screenOrientation': 'portrait',
          'android:excludeFromRecents':'true',
          'android:taskAffinity':      pkg + '.incoming',
        },
      });
    }
    return config;
  });
}

// --------------------------------------------------------------------------
// Compose and export
// --------------------------------------------------------------------------
module.exports = function withRideRequestBridge(config) {
  config = withNativeFiles(config);
  config = withCustomStyles(config);
  config = withCustomManifest(config);
  return config;
};
