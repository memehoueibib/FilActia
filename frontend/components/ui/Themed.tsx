// Themed.tsx

import { Text as DefaultText, View as DefaultView, useColorScheme } from 'react-native';

/**
 * Cette fonction renvoie la couleur "light" ou "dark" selon le thème renvoyé par useColorScheme().
 * Si aucune n'est fournie, on utilise des valeurs de secours (#fff, #000, etc.).
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: string
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = theme === 'light' ? props.light : props.dark;

  // On peut mettre une couleur par défaut si ni props.light ni props.dark n'est fourni
  // colorName ici ne sert plus à indexer un objet Colors, mais on le laisse si tu veux l'exploiter plus tard
  return colorFromProps ?? (colorName === 'background' ? '#fff' : '#000');
}

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

/**
 * Composant Text
 * - Utilise soit la couleur "lightColor"/"darkColor", soit du noir (#000) par défaut
 */
export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  // Ici, on se contente d'une couleur de texte fixe :
  // const color = '#000';
  // Ou on peut lier à notre hook useThemeColor :
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

/**
 * Composant View
 * - Utilise soit la couleur "lightColor"/"darkColor", soit du blanc (#fff) par défaut
 */
export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  // Choix du background via le hook, ou valeur fixe
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
