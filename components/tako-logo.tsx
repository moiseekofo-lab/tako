import { Platform, StyleSheet, Text, View } from 'react-native';

type TakoLogoProps = {
  size?: 'large' | 'login' | 'small';
  color?: string;
};

export function TakoLogo({ size = 'small', color = 'white' }: TakoLogoProps) {
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
            { backgroundColor: color },
          ]}
        />
      </View>

      <Text style={[styles.word, isLarge ? styles.wordLarge : isLogin ? styles.wordLogin : styles.wordSmall, { color }]}>
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
    height: 58,
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
    height: 52,
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
    fontFamily: Platform.select({
      ios: 'Boordens Street',
      android: 'Boordens Street',
      default: 'Boordens Street',
    }),
    fontWeight: '300',
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
    fontSize: 43,
    lineHeight: 51,
  },
});
