@api @security
Feature: API access control
  The BFF must reject callers who aren't logged in (401) and callers without
  the required role (403), whatever the UI shows or hides.

  Scenario Outline: Anonymous callers get 401 from <endpoint>
    When an anonymous user sends a "GET" request to "<endpoint>"
    Then the response status should be 401

    Examples:
      | endpoint                   |
      | /api/claims                |
      | /api/admin/claims          |
      | /api/admin/users           |
      | /api/admin/dashboard/stats |

  Scenario: A malformed access token is rejected with 401
    When a user with a malformed access token sends a "GET" request to "/api/claims"
    Then the response status should be 401

  Scenario Outline: A claimant gets 403 from <endpoint>
    When "claimant" sends a "GET" request to "<endpoint>"
    Then the response status should be 403

    Examples:
      | endpoint                   |
      | /api/admin/claims          |
      | /api/admin/users           |
      | /api/admin/dashboard/stats |

  Scenario Outline: An admin can use <endpoint>
    When "admin" sends a "GET" request to "<endpoint>"
    Then the response status should be 200

    Examples:
      | endpoint                   |
      | /api/admin/claims          |
      | /api/admin/users           |
      | /api/admin/dashboard/stats |

  # The claimant's request carries a valid CSRF token, and the admin's identical
  # request succeeds. Together they prove the 403 comes from the role check —
  # without them, a missing CSRF token would also give 403 and hide a broken role check.
  Scenario: A claimant cannot change a claim's status, but an admin can
    Given "claimant" has submitted a claim through the API
    When "claimant" changes the claim status to "UNDER_REVIEW" through the API
    Then the response status should be 403
    When "admin" changes the claim status to "UNDER_REVIEW" through the API
    Then the response status should be 200

