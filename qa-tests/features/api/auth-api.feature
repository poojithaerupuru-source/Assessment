@api @auth
Feature: Login API
  The BFF login endpoint issues the session cookie the UI relies on.

  Scenario: Valid credentials return 200 and set the access token cookie
    When "claimant" logs in through the API
    Then the response status should be 200
    And an access token cookie should be set

  # Unregistered email on purpose: failed logins lock seeded users (brute-force protection).
  Scenario: Unknown credentials are rejected with 401
    When an unregistered user logs in through the API
    Then the response status should be 401
