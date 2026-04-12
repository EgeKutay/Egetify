Feature: Music Search
  As a user
  I want to search for music
  So that I can find songs to play

  Background:
    Given a registered user with id 1 and a valid JWT token

  Scenario: Search requires a query parameter
    When I GET "/search"
    Then the response status is 400

  Scenario: Authenticated user can search
    When I GET "/search?q=test+song"
    Then the response status is 200

  Scenario: Unauthenticated search is rejected
    Given no JWT token is set
    When I GET "/search?q=test"
    Then the response status is 403
