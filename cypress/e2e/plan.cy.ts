// ─── Tests de visualisation du plan ───────────────────────────────────────

describe('Visualisation du plan', () => {
  beforeEach(() => {
    cy.resetBackend()
    cy.registerUser()
    cy.login()

    // Importer le plan de test
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

  it('affiche le plan sur le dashboard et accède au détail', function () {
    cy.visit('/dashboard')
    cy.contains('Plan 10km Cypress E2E').should('be.visible')
    cy.contains('Plan 10km Cypress E2E').click()
    cy.url().should('include', `/plan/${this.planId}`)
  })

  it('affiche les séances de la semaine courante', function () {
    cy.visit(`/plan/${this.planId}`)
    cy.contains(/semaine/i).should('be.visible')
    cy.contains(/footing|tempo|sortie longue|intervalle/i).should('be.visible')
  })

  it('navigue entre les semaines avec les boutons Précédent/Suivant', function () {
    cy.visit(`/plan/${this.planId}`)
    cy.contains('Semaine précédente').should('be.visible')
    cy.contains('Semaine suivante').should('be.visible')

    cy.contains('Semaine suivante').click()
    cy.contains(/semaine 2|développement/i).should('be.visible')

    cy.contains('Semaine précédente').click()
    cy.contains(/semaine 1|base/i).should('be.visible')
  })

  it('affiche le bouton "Voir les blocs" uniquement pour les séances INTERVAL/TEMPO', function () {
    cy.visit(`/plan/${this.planId}`)

    // Naviguer vers la semaine qui contient la séance INTERVAL
    // (semaine 1 si c'est la semaine courante, sinon naviguer)
    cy.get('body').then(($body) => {
      if (!$body.text().includes('6 × 800m')) {
        cy.contains('Semaine précédente').click()
      }
    })

    cy.contains('Voir les blocs').should('be.visible')
  })

  it('déplie et replie les blocs d\'une séance INTERVAL', function () {
    cy.visit(`/plan/${this.planId}`)

    cy.get('body').then(($body) => {
      if (!$body.text().includes('6 × 800m')) {
        cy.contains('Semaine précédente').click()
      }
    })

    cy.contains('Voir les blocs').click()
    cy.contains('Trottinement léger').should('be.visible')
    cy.contains('6 × 800m @ VMA').should('be.visible')

    cy.contains('Masquer les blocs').click()
    cy.contains('Trottinement léger').should('not.exist')
  })

  it('affiche les statistiques du plan actif sur le dashboard', function () {
    cy.visit('/dashboard')
    cy.contains('Progression').should('be.visible')
    cy.contains('Distance').should('be.visible')
    cy.contains('Semaines').should('be.visible')
    cy.contains('Prochaine séance').should('be.visible')
  })

  it('archive le plan depuis le dashboard', function () {
    cy.visit('/dashboard')
    cy.contains('Archiver ce plan').click()
    cy.contains('Plan 10km Cypress E2E').should('not.exist')
  })

  it('supprime le plan depuis le dashboard avec confirmation', function () {
    cy.visit('/dashboard')
    cy.contains('Supprimer').first().click()

    // Modale de confirmation
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').contains('Supprimer').click()

    cy.contains('Plan 10km Cypress E2E').should('not.exist')
  })
})
