import { LocalProvider } from './localProvider.js'

export const buildProviderRegistry = (config, logger) => {
  const localProvider = new LocalProvider(config.local)
  const providers = new Map([['local', localProvider]])

  if ((config.enabledProviders ?? []).some((providerName) => providerName !== 'local')) {
    logger.warn('Non-local providers are disabled in this build')
  }

  return {
    async initialize() {
      await localProvider.initialize()
    },
    listAvailable() {
      return ['local']
    },
    get(name) {
      return providers.get(name)
    }
  }
}
