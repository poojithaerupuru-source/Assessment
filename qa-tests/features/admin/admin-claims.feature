@admin
Feature: Admin claims overview
  As an admin
  I want to see all submitted claims
  So that I can review them

  # Each scenario creates its own claim: on a fresh database (e.g. in CI) the admin
  # page shows "No claims found" and no table, so the scenarios can't rely on data
  # left behind by other tests.
  Background:
    Given "claimant" has submitted a claim through the API
    And I am logged in as "admin"
    And I am on the "Admin Claims" page

  @smoke
  Scenario: Admin sees the claims table
    Then I should see the admin claims table

  Scenario: Admin filters claims by status
    When I filter claims by status "Submitted"
    Then every claim shown should have status "Submitted"

  # BUG-08: the admin claims store keeps whichever response arrives last. If the
  # initial unfiltered load is slower than the filtered one, it overwrites the
  # filtered list: the dropdown says "Submitted" but the table shows every status.
  @bug @fail
  Scenario: A slow initial load does not overwrite the filtered list
    Given the unfiltered admin claims list responds slowly
    When I reload the page
    And I filter claims by status "Submitted" before the list has loaded
    And the slow unfiltered response has arrived
    Then every claim shown should have status "Submitted"
