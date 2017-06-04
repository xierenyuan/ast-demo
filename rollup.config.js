import babel from 'rollup-plugin-babel'

export default {
  entry: 'lib/index.js',
  dest: 'dist/index.js',
  plugins: [
    babel({
      exclude: 'node_modules/**',
      runtimeHelpers: true
    })
  ]
}
