import StyleDictionaryPackage, { Dictionary, Platform } from 'style-dictionary';

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

export const getTsPlatform: (theme: string) => Platform = (theme) => ({
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
})