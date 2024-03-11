import micromatch from 'micromatch'

const list = micromatch(
  [
    '@ver/test',
    '@kk',
    '@kk/jest',
    'local-storage',
    'local',
    'react',
    'react-dom',
  ],
  ['@kk/*', 'local-*', 'react']
)

console.log(list)
