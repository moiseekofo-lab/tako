import { Platform, StyleSheet, Text, View } from 'react-native';

type TakoLogoProps = {
  size?: 'large' | 'login' | 'small';
  color?: string;
};

const TAKO_ORANGE = '#FF8B45';
const TAKO_FONT = Platform.select({
  ios: 'Alkatra',
  android: 'Alkatra',
  web: 'Alkatra, "Segoe UI", Arial, sans-serif',
  default: 'Alkatra',
});

export function TakoLogo({ size = 'small', color = '#061F68' }: TakoLogoProps) {
  const isLarge = size === 'large';
  const isLogin = size === 'login';
  const showTagline = isLarge || isLogin;

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

      <View style={styles.wordBlock}>
        <Text style={[styles.word, isLarge ? styles.wordLarge : isLogin ? styles.wordLogin : styles.wordSmall, { color }]}>
          TaKo
        </Text>
        {showTagline ? (
          <Text style={[styles.tagline, isLarge ? styles.taglineLarge : styles.taglineLogin, { color }]}>
            Accessible, Sécurisé et Rapide
          </Text>
        ) : null}
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
    height: 136,
  },
  logoLogin: {
    height: 86,
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
    width: 62,
    height: 64,
    marginRight: 11,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    left: 0,
    top: 9,
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
    width: 22,
    height: 49,
    borderRadius: 13,
    left: 32,
    top: 1,
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
    fontWeight: '600',
    letterSpacing: 0,
    includeFontPadding: true,
  },
  wordBlock: {
    justifyContent: 'center',
    paddingTop: 4,
  },
  wordLarge: {
    fontSize: 84,
    lineHeight: 106,
  },
  wordSmall: {
    fontSize: 49,
    lineHeight: 66,
  },
  wordLogin: {
    fontSize: 42,
    lineHeight: 58,
  },
  tagline: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: 'Roboto, Arial, sans-serif',
      default: 'Arial',
    }),
    fontWeight: '800',
    letterSpacing: 0,
  },
  taglineLarge: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: -10,
  },
  taglineLogin: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: -5,
  },
});
