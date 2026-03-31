// ─── Commandes personnalisées Cypress ─────────────────────────────────────

declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>
      resetBackend(): Chainable<void>
      registerUser(username?: string, password?: string): Chainable<void>
    }
  }
}

/**
 * Connexion via l'API (sans passer par l'UI) pour accélérer les tests.
 * Stocke le JWT dans localStorage sous la clé "token".
 */
Cypress.Commands.add('login', (
  username = Cypress.env('TEST_USERNAME'),
  password = Cypress.env('TEST_PASSWORD'),
) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('CYPRESS_API_URL')}/api/auth/login`,
    body: { username, password },
  }).then(({ body }) => {
    window.localStorage.setItem('token', body.token)
    window.localStorage.setItem('userId', body.userId)
    window.localStorage.setItem('username', body.username)
  })
})

/**
 * Réinitialise l'état du backend staging avant chaque test.
 */
Cypress.Commands.add('resetBackend', () => {
  cy.request('DELETE', `${Cypress.env('CYPRESS_API_URL')}/api/test/reset`)
})

/**
 * Crée l'utilisateur de test via l'API register.
 * À appeler après resetBackend, avant login.
 */
Cypress.Commands.add('registerUser', (
  username = Cypress.env('TEST_USERNAME'),
  password = Cypress.env('TEST_PASSWORD'),
) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('CYPRESS_API_URL')}/api/auth/register`,
    body: { username, password },
  })
})

export {}
