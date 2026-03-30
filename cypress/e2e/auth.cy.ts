// ─── Tests d'authentification ──────────────────────────────────────────────

describe('Authentification', () => {
  beforeEach(() => {
    cy.resetBackend()
    cy.registerUser()
  })

  it('affiche la page de connexion sur /', () => {
    cy.visit('/')
    cy.contains('Connexion').should('be.visible')
    cy.get('input[placeholder="mon_pseudo"]').should('exist')
  })

  it('affiche une erreur avec des identifiants invalides', () => {
    cy.visit('/')
    cy.get('input[placeholder="mon_pseudo"]').type('mauvais_user')
    cy.get('input[type="password"]').type('mauvais_mdp')
    cy.get('button[type="submit"]').click()
    cy.contains(/identifiant|mot de passe|incorrect|invalide/i).should('be.visible')
  })

  it('redirige vers le dashboard après connexion réussie', () => {
    cy.visit('/')
    cy.get('input[placeholder="mon_pseudo"]').type(Cypress.env('TEST_USERNAME'))
    cy.get('input[type="password"]').type(Cypress.env('TEST_PASSWORD'))
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Tableau de bord').should('be.visible')
  })

  it('déconnecte et redirige vers la page de connexion', () => {
    cy.login()
    cy.visit('/dashboard')
    cy.contains('Déconnexion').click()
    cy.url().should('not.include', '/dashboard')
    cy.contains('Connexion').should('be.visible')
  })

  it('redirige vers /login si non authentifié', () => {
    cy.visit('/dashboard')
    cy.url().should('not.include', '/dashboard')
  })
})
