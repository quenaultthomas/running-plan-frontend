// ─── Tests d'interactions sur les séances ─────────────────────────────────

describe('Interactions séances', () => {
  beforeEach(() => {
    cy.request('DELETE', Cypress.env('CYPRESS_API_URL') + '/api/test/reset')
    cy.login()

    cy.fixture('plan.json').then((plan) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('CYPRESS_API_URL')}/api/plan/import`,
        body: { planJson: JSON.stringify(plan) },
        headers: {
          Authorization: `Bearer ${window.localStorage.getItem('token')}`,
        },
      }).then(({ body }) => {
        cy.wrap(body.planId).as('planId')
      })
    })
  })

  it('marque une séance comme réalisée', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.contains('Marquer comme réalisée').first().click()
    cy.contains('Séance réalisée', { timeout: 10000 }).should('be.visible')
  })

  it('passe une séance (skip)', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.contains('Passer la séance').first().click()
    cy.contains('Séance sautée', { timeout: 10000 }).should('be.visible')
  })

  it('ouvre la modale de modification d\'une séance', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.get('[aria-label="Modifier la séance"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Modifier la séance').should('be.visible')
    cy.contains('Durée (minutes)').should('be.visible')
    cy.contains('Distance (km)').should('be.visible')
  })

  it('modifie la durée d\'une séance et calcule l\'allure automatiquement', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.get('[aria-label="Modifier la séance"]').first().click()

    const dialog = () => cy.get('[role="dialog"]')
    dialog().find('input[id="edit-duration"]').clear().type('60')
    dialog().find('input[id="edit-distance"]').clear().type('10')

    // Allure calculée : 60/10 = 6:00 min/km
    dialog().contains('Allure calculée').should('be.visible')
    dialog().contains('6:00 min/km').should('be.visible')

    dialog().contains('Enregistrer').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('60 min').should('be.visible')
  })

  it('ferme la modale sans sauvegarder au clic sur Annuler', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.get('[aria-label="Modifier la séance"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.contains('Annuler').click()
    cy.get('[role="dialog"]').should('not.exist')
  })

  it('les boutons d\'action disparaissent après complétion d\'une séance', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.contains('Marquer comme réalisée').first().click()
    cy.contains('Séance réalisée', { timeout: 10000 }).should('be.visible')

    // Les boutons d'action ne doivent plus être visibles pour cette séance
    cy.contains('Marquer comme réalisée').should('not.exist')
    cy.contains('Passer la séance').should('not.exist')
  })
})
