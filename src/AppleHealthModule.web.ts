import { registerWebModule, NativeModule } from 'expo';

import { AppleHealthModuleEvents } from './AppleHealth.types';

class AppleHealthModule extends NativeModule<AppleHealthModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(AppleHealthModule, 'AppleHealthModule');
