import { NativeModule, requireNativeModule } from 'expo';

import { AppleHealthModuleEvents } from './AppleHealth.types';

declare class AppleHealthModule extends NativeModule<AppleHealthModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AppleHealthModule>('AppleHealth');
