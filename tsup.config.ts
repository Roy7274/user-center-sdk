import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'config/index': 'src/config/index.ts',
    'auth/index': 'src/auth/index.ts',
    'points/index': 'src/points/index.ts',
    'deposit/index': 'src/deposit/index.ts',
    'components/index': 'src/components/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next', 'next-auth'],
  treeshake: true,
  minify: false,
})
