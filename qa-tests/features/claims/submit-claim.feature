@claims
Feature: Submit a claim
  As a claimant
  I want to submit an insurance claim
  So that the insurer can review it

  Background:
    Given I am logged in as "claimant"
    And I am on the "My Claims" page

  @smoke
  Scenario: Claimant submits a valid claim and sees it in their list
    When I start a new claim
    And I enter valid incident details with a claim amount of "5000.00"
    And I enter a valid description
    And I review and submit the claim
    Then I should see a confirmation that the claim was submitted
    And my new claim should appear in my claims list with status "Submitted"
