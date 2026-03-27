import { registerRootComponent } from 'expo';

// ⚠️ Location background task MUST be imported at the top level before App mounts.
// expo-task-manager scans for defineTask calls at module init time.
import './src/services/locationTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
