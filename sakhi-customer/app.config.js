import { existsSync } from 'fs';

// Only reference Firebase config files if they actually exist on disk.
// This prevents "Could not parse Expo config" errors when building in
// environments where the files haven't been added yet (e.g. Expo Go dev).
// NOTE: google-services.json is kept for Firebase Cloud Messaging (FCM) only.
//       All Google Maps SDKs have been removed from this app.
const androidGoogleServices = existsSync('google-services.json')
  ? './google-services.json'
  : undefined;

const iosGoogleServices = existsSync('GoogleService-Info.plist')
  ? './GoogleService-Info.plist'
  : undefined;

export default {
  expo: {
    name: "Sakhi",
    slug: "sakhi-customer",
    version: "1.0.5",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "sakhi",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#F5F0FF"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F5F0FF"
      },
      ...(androidGoogleServices && { googleServicesFile: androidGoogleServices }),
      package: "in.sakhirides.customer",
      versionCode: 5,
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ]
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "in.sakhirides.customer",
      buildNumber: "8",
      ...(iosGoogleServices && { googleServicesFile: iosGoogleServices }),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Sakhi needs your location to find nearby drivers and track your ride.",
        NSLocationAlwaysUsageDescription: "Sakhi needs your location to share it with emergency contacts during an active ride.",
        NSCameraUsageDescription: "Sakhi needs camera access for gender verification via selfie.",
        NSPhotoLibraryUsageDescription: "Sakhi needs photo library access to upload your Aadhaar card images."
      }
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-sharing",
      "expo-status-bar",
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#BEA3D8",
          "defaultChannel": "default",
          "androidMode": "default"
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Sakhi to access your location."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Sakhi needs access to your photos to upload Aadhaar card images."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Sakhi needs camera access for face verification."
        }
      ],
      "./plugins/withAdiRegistration",
      "./plugins/withUpiQueries",
      "./plugins/withPhonePeMaven"
    ],
    experiments: {
      typedRoutes: false
    },
    extra: {
      eas: {
        projectId: "9664af70-e889-40d2-9b8a-de3dc0acd8f3"
      },
      router: {}
    },
    owner: "shubh_up301"
  }
};

