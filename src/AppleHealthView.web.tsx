import * as React from 'react';

import { AppleHealthViewProps } from './AppleHealth.types';

export default function AppleHealthView(props: AppleHealthViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
