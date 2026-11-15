@api @security @isolation
Feature: Claimants only see their own claims
  A claim is private to the claimant who submitted it.

  "another claimant" is created directly in Keycloak by the test setup,
  because the app's own signup is broken (BUG-05).

  Background:
    Given "claimant" has submitted a claim through the API

  Scenario: The owner can read their claim by its ID
    When "claimant" requests the submitted claim by its ID
    Then the response status should be 200
    And the response should contain the submitted claim

  Scenario: The claim does not appear in another claimant's list
    When "another claimant" sends a "GET" request to "/api/claims"
    Then the response status should be 200
    And the response should not contain the submitted claim

  Scenario: Another claimant cannot read the claim by its ID
    When "another claimant" requests the submitted claim by its ID
    Then the response status should not be 200
    And the response should not contain the submitted claim

  # BUG-07: the BFF turns claims-service 403/404 into 500. No data leaks,
  # but the API breaks its own contract (bff-api.yml documents 403 and 404).
  @bug @fail
  Scenario: Another claimant gets 403 Forbidden, as the API contract documents
    When "another claimant" requests the submitted claim by its ID
    Then the response status should be 403

  @bug @fail
  Scenario: An unknown claim ID returns 404 Not Found, as the API contract documents
    When "claimant" sends a "GET" request to "/api/claims/00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
