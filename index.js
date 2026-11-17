if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
