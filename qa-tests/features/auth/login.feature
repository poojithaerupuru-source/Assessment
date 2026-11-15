@smoke @auth
Feature: Login
  As a registered user
  I want to log in with my email and password
  So that I can see the pages for my role

  Background:
    Given I am on the login page

  Scenario: Claimant is taken to their claims after logging in
    When I log in as "claimant"
    Then I should be on the "My Claims" page

  Scenario: Admin is taken to the dashboard after logging in
    When I log in as "admin"
    Then I should be on the "Admin Dashboard" page

  # Uses an unregistered email on purpose: Keycloak brute-force protection is on,
  # so failed logins against a shared seeded user can lock it for later scenarios.
  Scenario: Login is refused for an unregistered user
    When I log in with an unregistered email
    Then I should see a login error message
    And I should be on the "Login" page
