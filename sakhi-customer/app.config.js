import 'dotenv/config';

export default {
  expo: {
    name: "Sakhi",
    slug: "sakhi-customer",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "sakhi",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#F5F0FF"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "in.sakhirides.customer",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Sakhi needs your location to find nearby drivers and track your ride.",
        NSLocationAlwaysUsageDescription: "Sakhi needs your location to share it with emergency contacts during an active ride.",
        NSCameraUsageDescription: "Sakhi needs camera access for gender verification via selfie.",
        NSPhotoLibraryUsageDescription: "Sakhi needs photo library access to upload your Aadhaar card images."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F5F0FF"
      },
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
        }
      },
      package: "in.sakhirides.customer",
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
      supportsTablet: false,
      bundleIdentifier: "in.sakhirides.customer",
      googleServicesFile: "./GoogleService-Info.plist",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Sakhi needs your location to find nearby drivers and track your ride.",
        NSLocationAlwaysUsageDescription: "Sakhi needs your location to share it with emergency contacts during an active ride.",
        NSCameraUsageDescription: "Sakhi needs camera access for gender verification via selfie.",
        NSPhotoLibraryUsageDescription: "Sakhi needs photo library access to upload your Aadhaar card images."
      }
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
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
      ]
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
