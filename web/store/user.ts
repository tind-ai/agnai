import { AppSchema } from '../../srv/db/schema'
import { api, clearAuth, getAuth, setAuth } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type State = {
  loading: boolean
  error?: string
  loggedIn: boolean
  jwt: string
  profile?: AppSchema.Profile
  user?: AppSchema.User
}

export const userStore = createStore<State>(
  'user',
  init()
)((get, set) => {
  return {
    async *login(_, username: string, password: string, onSuccess?: () => void) {
      yield { loading: true }

      const res = await api.post('/user/login', { username, password })
      yield { loading: false }
      if (res.error) {
        return toastStore.error(`Failed to authenticated`)
      }

      yield {
        loading: false,
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
      }

      onSuccess?.()
      setAuth(res.result.token)
    },
    async *register(
      _,
      newUser: { handle: string; username: string; password: string },
      onSuccess?: () => void
    ) {
      yield { loading: true }

      const res = await api.post('/user/register', newUser)
      yield { loading: false }
      if (res.error) {
        return toastStore.error(`Failed to register`)
      }

      setAuth(res.result.token)

      yield {
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
      }

      toastStore.success('Welcome to Agnaistic')
      onSuccess?.()
    },
    logout() {
      clearAuth()
      return { jwt: '', profile: undefined, user: undefined, loggedIn: false }
    },
    async getProfile() {
      const res = await api.get('/user')
      if (res.error) return toastStore.error(`Failed to get profile`)
      if (res.result) {
        return { profile: res.result }
      }
    },
    async getConfig() {
      const res = await api.get('/user/config')
      if (res.error) return toastStore.error(`Failed to get user config`)
      if (res.result) {
        return { user: res.result }
      }
    },

    async updateProfile(_, profile: { handle: string; avatar?: File }) {
      const form = new FormData()
      form.append('handle', profile.handle)
      if (profile.avatar) {
        form.append('avatar', profile.avatar)
      }

      const res = await api.upload('/user/profile', form)
      if (res.error) toastStore.error(`Failed to update profile`)
      if (res.result) {
        toastStore.success(`Updated settings`)
        return { profile: res.result }
      }
    },

    async updateConfig(
      _,
      config: Pick<AppSchema.User, 'koboldUrl' | 'novelApiKey' | 'novelModel' | 'defaultAdapter'>
    ) {
      const res = await api.post('/user/config', config)
      if (res.error) toastStore.error(`Failed to update config`)
      if (res.result) {
        toastStore.success(`Updated settings`)
        return { user: res.result }
      }
    },
  }
})

function init(): State {
  const existing = getAuth()

  if (!existing) {
    return { loading: false, jwt: '', loggedIn: false }
  }

  return {
    loggedIn: true,
    loading: false,
    jwt: existing,
  }
}
