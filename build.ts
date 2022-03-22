import { readFileSync, appendFileSync, unlinkSync } from "fs";
import StyleDictionaryPackage, { Dictionary, options } from 'style-dictionary';

// HAVE THE STYLE DICTIONARY CONFIG DYNAMICALLY GENERATED

const toPixelValue = (value: string) => {
  const numericValue = parseFloat(value);
  return Number.isNaN(numericValue) || numericValue === 0
    ? value
    : `${numericValue}px`;
}

const getTypeName = (category: string) => `${category[0].toUpperCase()}${category.substring(1)}Tokens`;

const getTsTokens = (dictionary: Dictionary, category: string): string | undefined => {
  const tokens = dictionary.allTokens
    .filter(t => t.attributes?.category === category)
    .map(t => t.attributes?.category == "fontWeight"
      ? `${t.name}: ${t.value},`
      : `${t.name}: "${t.value}",`)
    .join('\n  ');
  if (category === 'shadow') {
    // Reusing same tokens for shadowBrand
    const brandTokens = dictionary.allTokens
      .filter(t => t.attributes?.category === category)
      .map(t => `${t.name}Brand: "${t.value}",`)
      .join('\n  ');
    return tokens.length > 0
      ? `export const ${category}Tokens: ShadowTokens & ShadowBrandTokens = {\n  ${tokens}\n  ${brandTokens}\n};`
      : undefined;
  }
  const typeName = getTypeName(category);
  return tokens.length > 0
    ? `export const ${category}Tokens: ${typeName} = {\n  ${tokens}\n};`
    : undefined;
};

const getTsImports = (categories: string[]) => {
  const types = categories
    .map(c => c === 'shadow'
      ? 'ShadowTokens, ShadowBrandTokens'
      : getTypeName(c))
    .join(', ')
  return `import { ${types} } from "@fluentui/react-components";`;
}

const getTsFileHeader = () => `/**\n * Do not edit directly\n * Generated on ${new Date().toUTCString()}\n */`;

const getXamlColorTokens = (dictionary: Dictionary, prefix: string): string | undefined => {
  return dictionary.allTokens
    .filter(t => t.attributes?.category === 'color')
    .map(t => `<Color x:Key="${prefix}${t.name}">${t.value}</Color>`)
    .join('\r\n  ');
};

const getXamlBrushTokens = (dictionary: Dictionary, prefix: string): string | undefined => {
  return dictionary.allTokens
    .filter(t => t.attributes?.category === 'color')
    .map(t => `<SolidColorBrush\r\n    x:Key="${t.name}"\r\n    Color="{StaticResource ${prefix}${t.name}}"\r\n    p:Freeze="True"\r\n  />`)
    .join('\r\n  ');
};

const getXamlFontSizeTokens = (dictionary: Dictionary): string | undefined => {
  return dictionary.allTokens
    .filter(t => t.attributes?.category === 'fontSize')
    .map(t => `<system:Double x:Key="${t.name}">${t.value}</system:Double>`)
    .join('\r\n  ');
};

// https://docs.microsoft.com/en-us/dotnet/api/system.windows.fontweights
const xamlFontWeightValues: Record<string, string> = {
  '100': 'Thin',
  '200': 'ExtraLight',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'SemiBold',
  '700': 'Bold',
  '800': 'ExtraBold',
  '900': 'Heavy',
  '950': 'ExtraBlack'
}

const getXamlFontWeightTokens = (dictionary: Dictionary): string | undefined => {
  return dictionary.allTokens
    .filter(t => t.attributes?.category === 'fontWeight')
    .map(t => `<FontWeight x:Key="${t.name}">${xamlFontWeightValues[t.value as string]}</FontWeight>`)
    .join('\r\n  ');
};

const getXamlStrokeWidthTokens = (dictionary: Dictionary): string | undefined => {
  return dictionary.allTokens
    .filter(t => t.attributes?.category === 'strokeWidth')
    .map(t => `<Thickness x:Key="${t.name}">${t.value}</Thickness>`)
    .join('\r\n  ');
};

const getXamlBorderRadiusTokens = (dictionary: Dictionary): string | undefined => {
  return dictionary.allTokens
    .filter(t => t.attributes?.category === 'borderRadius')
    .map(t => `<CornerRadius x:Key="${t.name}">${t.value}</CornerRadius>`)
    .join('\r\n  ');
};

const getXamlFileHeader = () => `<!--\r\n  Do not edit directly\r\n  Generated on ${new Date().toUTCString()}\r\n-->`;

StyleDictionaryPackage.registerFormat({
  name: 'typescript/fluentui',
  formatter: ({ dictionary, options }) => {
    const tokens = options.categories
      .map((c: string) => getTsTokens(dictionary, c))
      .filter((t: string | undefined) => !!t)
      .join('\n\n');
    return `${getTsFileHeader()}\n\n${getTsImports(options.categories)}\n\n${tokens}\n`
  }
});

// NOTE: Built-in 'size/px' only working if prop.attributes.category === 'size'.
StyleDictionaryPackage.registerTransform({
  name: 'sizes/px',
  type: 'value',
  matcher: (token) =>
    [
      'fontSizes',
      'lineHeights',
      'borderRadius',
      'borderWidth'
    ].includes(token.type),
  transformer: (token) => toPixelValue(token.original.value)
});

StyleDictionaryPackage.registerTransform({
  name: 'shadow/boxShadow',
  type: 'value',
  matcher: (token) => token.type === 'boxShadow',
  transformer: (token) => token.value.map((v: any) => `${[v.x, v.y, v.blur, v.spread].map(pv => toPixelValue(pv)).join(' ')} ${v.color}`).join(', ')
});

const resDictStartTag = '<ResourceDictionary\r\n  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"\r\n  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"\r\n>';
const resDictBrushesStartTag = '<ResourceDictionary\r\n  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"\r\n  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"\r\n  xmlns:p="http://schemas.microsoft.com/winfx/2006/xaml/presentation/options"\r\n>\r\n  <ResourceDictionary.MergedDictionaries>\r\n    <ResourceDictionary Source="Colors.xaml" />\r\n  </ResourceDictionary.MergedDictionaries>\r\n';
const resDictGlobalStartTag = '<ResourceDictionary\r\n  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"\r\n  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"\r\n  xmlns:system="clr-namespace:System;assembly=mscorlib"\r\n>'
const resDictEndTag = '</ResourceDictionary>';

StyleDictionaryPackage.registerFormat({
  name: 'xaml/fluentui/color',
  formatter: ({ dictionary, options }) => {
    const tokens = getXamlColorTokens(dictionary, options.prefix);
    return `  ${tokens}\r\n`
  }
});

StyleDictionaryPackage.registerFormat({
  name: 'xaml/fluentui/brush',
  formatter: ({ dictionary, options }) => {
    const tokens = getXamlBrushTokens(dictionary, options.prefix);
    return `${getXamlFileHeader()}\r\n${resDictBrushesStartTag}\r\n  ${tokens}\r\n${resDictEndTag}`
  }
});

StyleDictionaryPackage.registerFormat({
  name: 'xaml/fluentui/global',
  formatter: ({ dictionary }) => {
    const tokens = [
      getXamlFontSizeTokens(dictionary),
      getXamlFontWeightTokens(dictionary),
      getXamlStrokeWidthTokens(dictionary),
      getXamlBorderRadiusTokens(dictionary),
    ].join('\r\n\r\n  ');
    return `${getXamlFileHeader()}\r\n${resDictGlobalStartTag}\r\n  ${tokens}\r\n${resDictEndTag}`
  }
});

const concatFiles = (sources: string[], destination: string, header?: string, footer?: string) => {
  unlinkSync(destination);
  if (header) {
    appendFileSync(destination, header);
  }
  for (const src of sources) {
    const content = readFileSync(src);
    appendFileSync(destination, content);
    unlinkSync(src);
  }
  if (footer) {
    appendFileSync(destination, footer);
  }
}

const getStyleDictionaryConfig = (theme: string) => ({
  source: [
    `generated/tokens/${theme}.json`,
  ],
  platforms: {
    css: {
      transforms: [
        'attribute/cti',
        'name/cti/kebab',
        'sizes/px',
        'shadow/boxShadow'
      ],
      buildPath: 'generated/css/',
      files: [{
        destination: `${theme}.css`,
        format: 'css/variables',
        options: {
          selector: theme !== 'global' ? `.${theme}` : undefined,
        }
      }]
    },
    ts: {
      transforms: [
        'attribute/cti',
        'name/cti/camel',
        'sizes/px',
        'shadow/boxShadow'
      ],
      transformGroup: 'js',
      buildPath: 'generated/ts/',
      files: [{
        format: 'typescript/fluentui',
        destination: theme === 'global' ? 'base.ts' : `${theme}.ts`,
        options: {
          name: theme !== 'global' ? theme : undefined,
          categories: theme === 'global'
            ? [
              'lineHeight',
              'fontFamily',
              'fontSize',
              'fontWeight',
              'borderRadius',
              'strokeWidth'
            ]
            : [
              'color',
              'shadow',
            ],
        }
      }]
    },
    xaml: {
      transforms: [
        'attribute/cti',
        'name/cti/pascal',
      ],
      buildPath: 'generated/xaml/',
      files: theme === 'global' ? [
        {
          format: 'xaml/fluentui/global',
          destination: 'ConstantResources.xaml',
        }
      ] : [
        {
          format: 'xaml/fluentui/color',
          destination: `${theme}.Colors.xaml`,
          options: {
            prefix: `${theme[0].toUpperCase()}${theme.substring(1).toLowerCase()}.`
          }
        },
        {
          format: 'xaml/fluentui/brush',
          destination: `${theme[0].toUpperCase()}${theme.substring(1).toLowerCase()}.xaml`,
          options: {
            prefix: `${theme[0].toUpperCase()}${theme.substring(1).toLowerCase()}.`
          }
        }
      ]
    }
  }
});

console.log('Build started...');

// PROCESS THE DESIGN TOKENS FOR THE DIFFERENT BRANDS AND PLATFORMS

['global', 'dark', 'light'].map((theme) => {

  console.log('\n==============================================');
  console.log(`\nProcessing: ${theme}`);

  const StyleDictionary = StyleDictionaryPackage.extend(getStyleDictionaryConfig(theme));

  StyleDictionary.buildPlatform('css');
  StyleDictionary.buildPlatform('ts');
  StyleDictionary.buildPlatform('xaml');

  console.log('\nEnd processing');
});

concatFiles(
  [
    'generated/xaml/dark.Colors.xaml',
    'generated/xaml/light.Colors.xaml'
  ],
  'generated/xaml/Colors.xaml',
  `${getXamlFileHeader()}\n${resDictStartTag}\n`,
  resDictEndTag
);

console.log('\n==============================================');
console.log('\nBuild completed!');
