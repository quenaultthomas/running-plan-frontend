import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'https://running-plan-frontend-git-staging-quenaultthomas-projects.vercel.app',
    env: {
      CYPRESS_API_URL: 'https://web-staging-2686.up.railway.app',
      TEST_USERNAME: 'cypress_user',
      TEST_PASSWORD: 'Cypress_password1',
    },
    setupNodeEvents(_on, config) {
      if (process.env.CYPRESS_VERCEL_BYPASS) {
        const bypass = process.env.CYPRESS_VERCEL_BYPASS
        config.baseUrl = `${config.baseUrl}?x-vercel-protection-bypass=${bypass}`
      }
      return config
    },
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
  },
})
