module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        'assets': '@/assets',
        'components': '@/components',
        'core': '@/core',
        'views': '@/views',
        'utils': '@/utils'
      }
    }
  }
}
