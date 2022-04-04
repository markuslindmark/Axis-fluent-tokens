import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import StyleDictionaryPackage, { Dictionary, Platform } from 'style-dictionary';

const getJsonColorToTokensDict = (dictionary: Dictionary, theme: string): Record<string, string[]> => {
  const colorDict: Record<string, string[]> = {};
  for (const token of dictionary.allTokens.filter(t => t.attributes?.category === 'color')) {
    colorDict[token.value] = [...(colorDict[token.value] ?? []), `${theme}.${token.name}`]
  }
  return colorDict;
};

StyleDictionaryPackage.registerFormat({
  name: 'json/fluentui/color',
  formatter: ({ dictionary, options }) => {
    const tokens = getJsonColorToTokensDict(dictionary, options.theme);
    return JSON.stringify(tokens);
  }
});

export const getJsonPlatform: (theme: string) => Platform = (theme) => ({
  transforms: [
    'attribute/cti',
    'name/cti/camel',
  ],
  buildPath: 'generated/json/',
  files: theme === 'global' ? [
  ] : [
    {
      format: 'json/fluentui/color',
      destination: `${theme}-colors.json`,
      options: {
        theme,
      }
    },
  ]
});

export const mergeJsonDictFiles = () => {
  const sources = [
    'generated/json/dark-colors.json',
    'generated/json/light-colors.json'
  ];
  const destination = 'generated/json/colors.json';

  const dict: Record<string, string[]> = {};
  if (existsSync(destination)) {
    unlinkSync(destination);
  }
  for (const src of sources) {
    const jsonContent: Record<string, string[]> = JSON.parse(readFileSync(src).toString());
    unlinkSync(src);
    for (const key of Object.keys(jsonContent)) {
      dict[key] = [...(dict[key] ?? []), ...jsonContent[key]]
    }
  }
  writeFileSync(destination, Buffer.from(JSON.stringify(dict, Object.keys(dict).sort(), '  ')));
}