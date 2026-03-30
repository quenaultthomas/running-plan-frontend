// ─── Tests de génération de prompt ────────────────────────────────────────

describe('Génération de prompt', () => {
  beforeEach(() => {
    cy.resetBackend()
    cy.registerUser()
    cy.login()
    cy.visit('/plan/new')
  })

  it('affiche le formulaire en 3 étapes', () => {
    cy.contains('Nouveau plan').should('be.visible')
    cy.contains('Profil coureur').should('be.visible')
  })

  it('valide les champs de l\'étape 1 avant de passer à l\'étape 2', () => {
    cy.contains('Suivant').click()
    cy.contains(/niveau requis/i).should('be.visible')
  })

  it('navigue de l\'étape 1 à 3 et génère le prompt', () => {
    // Étape 1 — Profil coureur
    cy.get('select').first().select('INTERMEDIATE')
    cy.get('input[placeholder="3"]').type('3')
    cy.get('input[placeholder="12"]').type('12')
    cy.get('input[placeholder="05:30"]').type('05:30')
    cy.contains('Suivant').click()

    // Étape 2 — Objectif
    cy.contains('Objectif').should('be.visible')
    cy.get('select').first().select('TEN_KM')
    cy.get('input[type="date"]').type('2026-10-15')
    cy.contains('Suivant').click()

    // Étape 3 — Contraintes & nom
    cy.contains('Contraintes').should('be.visible')
    cy.get('input[placeholder*="semi-marathon"]').type('Mon plan 10km E2E')
    cy.contains('Générer le prompt').click()

    // Résultat : page prompt
    cy.url().should('include', '/plan/prompt')
    cy.contains(/prompt|claude|coller/i).should('be.visible')
  })

  it('le bouton Précédent revient à l\'étape précédente', () => {
    cy.get('select').first().select('BEGINNER')
    cy.get('input[placeholder="3"]').type('3')
    cy.get('input[placeholder="12"]').type('10')
    cy.get('input[placeholder="05:30"]').type('06:00')
    cy.contains('Suivant').click()

    cy.contains('Objectif').should('be.visible')
    cy.contains('Précédent').click()
    cy.contains('Profil coureur').should('be.visible')
  })
})
