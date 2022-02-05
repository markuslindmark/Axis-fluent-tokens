import StyleDictionaryPackage, { Dictionary } from 'style-dictionary';

// HAVE THE STYLE DICTIONARY CONFIG DYNAMICALLY GENERATED

const getTypeName = (category: string) => `${category[0].toUpperCase()}${category.substring(1)}Tokens`;

const getTokens = (dictionary: Dictionary, category: string): string | undefined => {
  const tokens = dictionary.allTokens
    .filter(t => t.attributes?.category === category)
    .map(t => t.attributes?.category == "fontWeight"
      ? `${t.name}: ${t.value},`
      : `${t.name}: "${t.value}",`)
    .join('\n  ');
  const typeName = category === 'shadow'
    ? 'ShadowTokens & ShadowBrandTokens'
    : getTypeName(category);
  return tokens.length > 0
    ? `export const ${category}Tokens: ${typeName} = {\n  ${tokens}\n};`
    : undefined;
};

const getImports = (categories: string[]) => {
  const types = categories
    .map(c => c === 'shadow'
      ? 'ShadowTokens, ShadowBrandTokens'
      : getTypeName(c))
    .join(', ')
  return `import { ${types} } from "@fluentui/react-components";`;
}

const getFileHeader = () => `/**\n * Do not edit directly\n * Generated on ${new Date().toUTCString()}\n */`;

StyleDictionaryPackage.registerFormat({
  name: 'typescript/fluentui',
  formatter: ({ dictionary, options }) => {
    const tokens = options.categories
      .map((c: string) => getTokens(dictionary, c))
      .filter((t: string | undefined) => !!t)
      .join('\n\n');
    return `${getFileHeader()}\n\n${getImports(options.categories)}\n\n${tokens}\n`
  }
});

// NOTE: Built-in 'size/px' only working if prop.attributes.category === 'size'.
StyleDictionaryPackage.registerTransform({
  name: 'sizes/px',
  type: 'value',
  matcher: (token) => {
    return [
      'fontSizes',
      'lineHeights',
      'borderRadius',
      'borderWidth'
    ].includes(token.type);
  },
  transformer: (token) => {
    const numericValue = parseFloat(token.original.value);
    return Number.isNaN(numericValue)
      ? token.original.value
      : `${numericValue}px`;
  }
});

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
        'sizes/px'
      ],
      transformGroup: 'js',
      buildPath: 'generated/ts/',
      files: [
        {
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
        },
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

  console.log('\nEnd processing');
});

console.log('\n==============================================');
console.log('\nBuild completed!');
