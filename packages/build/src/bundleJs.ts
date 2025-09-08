import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import { default as commonjs } from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join } from 'path'
import { rollup, type RollupOptions } from 'rollup'
import { root } from './root.js'

const options: RollupOptions = {
  input: join(root, 'packages/pty-host/src/ptyHostMain.ts'),
  preserveEntrySignatures: 'strict',
  treeshake: {
    propertyReadSideEffects: false,
  },
  output: {
    file: join(root, '.tmp/dist/dist/ptyHostMain.js'),
    format: 'es',
    freeze: false,
    generatedCode: {
      constBindings: true,
      objectShorthand: true,
    },
    inlineDynamicImports: true,
  },
  external: ['electron', 'execa', 'ws', 'node-pty', 'debug'],
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      presets: [pluginTypeScript],
    }),
    nodeResolve(),
    commonjs(),
  ],
}

export const bundleJs = async (): Promise<void> => {
  const input = await rollup(options)
  await input.write(options.output as any)
}
