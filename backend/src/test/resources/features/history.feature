Feature: Play History
  As a user
  I want my recently played songs recorded
  So that I can see them on the home feed

  Background:
    Given a registered user with id 1 and a valid JWT token

  Scenario: Record a play event
    When I POST to "/history" with body:
      """
      { "youtubeId": "dQw4w9WgXcQ" }
      """
    Then the response status is 200

  Scenario: Retrieve recently played songs
    Given the user has played a song with youtubeId "dQw4w9WgXcQ"
    When I GET "/history/recent"
    Then the response status is 200
