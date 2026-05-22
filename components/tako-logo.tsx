import { Platform, StyleSheet, Text, View } from 'react-native';

type TakoLogoProps = {
  size?: 'large' | 'login' | 'small';
  color?: string;
};

const TAKO_ORANGE = '#FFC35C';
const TAKO_FONT = Platform.select({
  ios: 'Alkatra',
  android: 'Alkatra',
  web: 'Alkatra, "Segoe UI", Arial, sans-serif',
  default: 'Alkatra',
});

export function TakoLogo({ size = 'small', color = '#061F68' }: TakoLogoProps) {
  const isLarge = size === 'large';
  const isLogin = size === 'login';

  return (
    <View style={[styles.logo, isLarge ? styles.logoLarge : isLogin ? styles.logoLogin : styles.logoSmall]}>
      <View style={[styles.mark, isLarge ? styles.markLarge : isLogin ? styles.markLogin : styles.markSmall]}>
        <View
          style={[styles.dot, isLarge ? styles.dotLarge : isLogin ? styles.dotLogin : styles.dotSmall, { backgroundColor: color }]}
        />
        <View
          style={[
            styles.slash,
            isLarge ? styles.slashLarge : isLogin ? styles.slashLogin : styles.slashSmall,
            { backgroundColor: TAKO_ORANGE },
          ]}
        />
      </View>

      <View style={[styles.wordBlock, isLarge ? styles.wordBlockLarge : isLogin ? styles.wordBlockLogin : styles.wordBlockSmall]}>
        <Text style={[styles.word, isLarge ? styles.wordLarge : isLogin ? styles.wordLogin : styles.wordSmall, { color }]}>
          TaKo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoLarge: {
    height: 112,
  },
  logoLogin: {
    height: 62,
  },
  logoSmall: {
    height: 64,
  },
  mark: {
    position: 'relative',
  },
  markLarge: {
    width: 118,
    height: 100,
    marginRight: 22,
  },
  markLogin: {
    width: 54,
    height: 54,
    marginRight: 10,
  },
  markSmall: {
    width: 68,
    height: 58,
    marginRight: 13,
  },
  dot: {
    position: 'absolute',
    backgroundColor: 'white',
  },
  dotLarge: {
    width: 37,
    height: 37,
    borderRadius: 19,
    left: 0,
    top: 17,
  },
  dotLogin: {
    width: 17,
    height: 17,
    borderRadius: 9,
    left: 0,
    top: 10,
  },
  dotSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    left: 0,
    top: 10,
  },
  slash: {
    position: 'absolute',
    backgroundColor: 'white',
    transform: [{ rotate: '29deg' }],
  },
  slashLarge: {
    width: 42,
    height: 93,
    borderRadius: 24,
    left: 61,
    top: 3,
  },
  slashLogin: {
    width: 19,
    height: 44,
    borderRadius: 13,
    left: 28,
    top: 4,
  },
  slashSmall: {
    width: 24,
    height: 54,
    borderRadius: 14,
    left: 35,
    top: 2,
  },
  word: {
    color: 'white',
    fontFamily: TAKO_FONT,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  wordBlock: {
    justifyContent: 'center',
    paddingTop: 0,
  },
  wordBlockLarge: {
    width: 300,
  },
  wordBlockLogin: {
    width: 136,
  },
  wordBlockSmall: {
    width: 154,
  },
  wordLarge: {
    fontSize: 92,
    lineHeight: 112,
  },
  wordSmall: {
    fontSize: 49,
    lineHeight: 66,
  },
  wordLogin: {
    fontSize: 42,
    lineHeight: 62,
  },
});
