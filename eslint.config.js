import vuetify from 'eslint-config-vuetify'

export default vuetify(
  { ts: true },
  // web/ is the committed production build
  { ignores: ['web/**'] },
)
