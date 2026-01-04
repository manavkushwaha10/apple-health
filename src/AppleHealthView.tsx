import { requireNativeView } from 'expo';
import * as React from 'react';

import { AppleHealthViewProps } from './AppleHealth.types';

const NativeView: React.ComponentType<AppleHealthViewProps> =
  requireNativeView('AppleHealth');

export default function AppleHealthView(props: AppleHealthViewProps) {
  return <NativeView {...props} />;
}
