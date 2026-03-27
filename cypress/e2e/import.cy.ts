// ─── Tests d'import de plan ────────────────────────────────────────────────

describe('Import de plan', () => {
  beforeEach(() => {
    cy.request('DELETE', Cypress.env('CYPRESS_API_URL') + '/api/test/reset')
    cy.login()
  })

  it('affiche la page d\'import', () => {
    cy.visit('/plan/import')
    cy.contains('Importer un plan').should('be.visible')
    cy.contains('Valider et importer').should('be.visible')
  })

  it('affiche une erreur si le JSON est invalide', () => {
    cy.visit('/plan/import')
    cy.get('textarea').type('{ json invalide !!!')
    cy.contains('Valider et importer').click()
    cy.contains(/json invalide/i).should('be.visible')
  })

  it('importe un plan valide et affiche l\'aperçu', () => {
    cy.fixture('plan.json').then((plan) => {
      cy.visit('/plan/import')
      cy.get('textarea').invoke('val', JSON.stringify(plan)).trigger('input')
      cy.contains('Valider et importer').click()
      cy.contains(/plan validé avec succès/i, { timeout: 15000 }).should('be.visible')
      cy.contains('Plan 10km Cypress E2E').should('be.visible')
      cy.contains('2 semaines').should('be.visible')
      cy.contains('6 séances').should('be.visible')
    })
  })

  it('confirme l\'import et redirige vers le dashboard', () => {
    cy.fixture('plan.json').then((plan) => {
      cy.visit('/plan/import')
      cy.get('textarea').invoke('val', JSON.stringify(plan)).trigger('input')
      cy.contains('Valider et importer').click()
      cy.contains(/plan validé avec succès/i, { timeout: 15000 })
      cy.contains('Confirmer l\'import').click()
      cy.url().should('include', '/dashboard')
      cy.contains('Plan 10km Cypress E2E').should('be.visible')
    })
  })

  it('propose d\'archiver si un plan actif existe déjà', () => {
    // 1er import
    cy.fixture('plan.json').then((plan) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('CYPRESS_API_URL')}/api/plan/import`,
        body: { planJson: JSON.stringify(plan) },
        headers: {
          Authorization: `Bearer ${window.localStorage.getItem('token')}`,
        },
        failOnStatusCode: false,
      })
    })

    // 2ème tentative → conflit 409
    cy.fixture('plan.json').then((plan) => {
      cy.visit('/plan/import')
      cy.get('textarea').invoke('val', JSON.stringify(plan)).trigger('input')
      cy.contains('Valider et importer').click()
      cy.contains(/archiver/i, { timeout: 15000 }).should('be.visible')
      cy.contains('Archiver mon plan actuel et importer').click()
      cy.contains(/plan validé avec succès/i, { timeout: 15000 }).should('be.visible')
    })
  })
})
