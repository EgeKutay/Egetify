Feature: Google Authentication
  As a user
  I want to sign in with my Google account
  So that I can access my personalised music library

  Scenario: Reject missing ID token
    Given the backend is running
    When I POST to "/auth/google" with body:
      """
      { "idToken": "" }
      """
    Then the response status is 400
    And the response body contains "error"

  Scenario: Reject malformed ID token
    Given the backend is running
    When I POST to "/auth/google" with body:
      """
      { "idToken": "not-a-real-token" }
      """
    Then the response status is 400
    And the response body contains "error"
