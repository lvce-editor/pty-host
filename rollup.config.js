import { babel } from '@rollup/plugin-babel'
import pluginTypeScript from '@babel/preset-typescript'

export default {
  input: 'src/ptyHostMain.ts',
  preserveEntrySignatures: 'strict',
  treeshake: {
    propertyReadSideEffects: false,
  },
  output: {
    file: 'dist/dist/ptyHostMain.js',
    format: 'es',
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      presets: [pluginTypeScript],
    }),
  ],
}
