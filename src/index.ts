// Reexport the native module. On web, it will be resolved to AppleHealthModule.web.ts
// and on native platforms to AppleHealthModule.ts
export { default } from './AppleHealthModule';
export { default as AppleHealthView } from './AppleHealthView';
export * from  './AppleHealth.types';
