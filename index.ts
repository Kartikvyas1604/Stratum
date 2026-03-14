import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import 'react-native-quick-base64';
import { install } from 'react-native-quick-crypto';
import { Buffer } from 'buffer';
import process from 'process';
import { TextDecoder, TextEncoder } from 'text-encoding';
import App from './App';
import { name as appName } from './app.json';

install();

global.Buffer = Buffer;
global.process = process;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

AppRegistry.registerComponent(appName, () => App);
