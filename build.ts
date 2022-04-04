import StyleDictionaryPackage from 'style-dictionary';
import { getJsonPlatform, mergeJsonDictFiles } from './build-json';
import { concatXamlFiles, getXamlPlatform } from './build-xaml';
import { getTsPlatform } from './build-ts';
import { getCssPlatform } from './build-css';

// HAVE THE STYLE DICTIONARY CONFIG DYNAMICALLY GENERATED

const toPixelValue = (value: string) => {
  const numericValue = parseFloat(value);
  return Number.isNaN(numericValue) || numericValue === 0
    ? value
    : `${numericValue}px`;
}

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

const getStyleDictionaryConfig = (theme: string) => ({
  source: [
    `generated/tokens/${theme}.json`,
  ],
  platforms: {
    css: getCssPlatform(theme),
    ts: getTsPlatform(theme),
    xaml: getXamlPlatform(theme),
    json: getJsonPlatform(theme),
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
  StyleDictionary.buildPlatform('json');

  console.log('\nEnd processing');
});

concatXamlFiles();

mergeJsonDictFiles();

console.log('\n==============================================');
console.log('\nBuild completed!');
