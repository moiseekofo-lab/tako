import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

const FONT_SCALE = 0.88;

type FontPatchGlobal = typeof globalThis & {
  __takoFontPatchApplied?: boolean;
};

const patchFontSizes = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(patchFontSizes);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const style = value as Record<string, unknown>;
  const nextStyle: Record<string, unknown> = {};

  Object.entries(style).forEach(([key, item]) => {
    if (key === 'fontSize' && typeof item === 'number') {
      nextStyle[key] = Math.max(12, Math.round(item * FONT_SCALE));
      return;
    }

    nextStyle[key] = patchFontSizes(item);
  });

  return nextStyle;
};

const globalState = globalThis as FontPatchGlobal;

if (!globalState.__takoFontPatchApplied) {
  const originalCreate = StyleSheet.create as unknown as (styles: any) => any;

  StyleSheet.create = ((styles: any) => originalCreate(patchFontSizes(styles))) as typeof StyleSheet.create;

  globalState.__takoFontPatchApplied = true;
}

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
