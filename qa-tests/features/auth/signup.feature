@auth @signup
Feature: Sign up
  As a new customer
  I want to create an account
  So that I can submit insurance claims

  Background:
    Given I am on the signup page

  # BUG-05 (see docs/TEST_STRATEGY.md): signup always fails with HTTP 500 because
  # the BFF logs in to Keycloak's admin API with the wrong password.
  # @fail marks this as an expected failure: the run stays green while the bug
  # exists, and Playwright reports it as "unexpectedly passed" once it's fixed.
  # Remove @fail to show the scenario failing red.
  @bug @fail
  Scenario: New user can create an account and is sent to login
    When I sign up as a new user
    Then I should see that my account was created
    And I should be on the "Login" page
