import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'https://yours-running-plan-staging.netlify.app',
    env: {
      CYPRESS_API_URL: 'https://running-plan-backend-staging.up.railway.app',
      TEST_USERNAME: 'cypress_user',
      TEST_PASSWORD: 'Cypress_password1',
    },
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
  },
})
