import { Platform, StyleSheet, Text, View } from 'react-native';

type TakoLogoProps = {
  size?: 'large' | 'login' | 'small';
};

export function TakoLogo({ size = 'small' }: TakoLogoProps) {
  const isLarge = size === 'large';
  const isLogin = size === 'login';

  return (
    <View style={[styles.logo, isLarge ? styles.logoLarge : isLogin ? styles.logoLogin : styles.logoSmall]}>
      <View style={[styles.mark, isLarge ? styles.markLarge : isLogin ? styles.markLogin : styles.markSmall]}>
        <View style={[styles.dot, isLarge ? styles.dotLarge : isLogin ? styles.dotLogin : styles.dotSmall]} />
        <View style={[styles.slash, isLarge ? styles.slashLarge : isLogin ? styles.slashLogin : styles.slashSmall]} />
      </View>

      <Text style={[styles.word, isLarge ? styles.wordLarge : isLogin ? styles.wordLogin : styles.wordSmall]}>
        TaKo
      </Text>
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
    height: 82,
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
    width: 88,
    height: 74,
    marginRight: 16,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    left: 0,
    top: 13,
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
    width: 31,
    height: 70,
    borderRadius: 18,
    left: 46,
    top: 2,
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
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'sans-serif-light',
      default: undefined,
    }),
    fontWeight: '200',
    letterSpacing: 0,
  },
  wordLarge: {
    fontSize: 84,
    lineHeight: 94,
  },
  wordSmall: {
    fontSize: 49,
    lineHeight: 56,
  },
  wordLogin: {
    fontSize: 62,
    lineHeight: 72,
  },
});
