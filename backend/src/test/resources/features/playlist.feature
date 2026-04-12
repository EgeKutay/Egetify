Feature: Playlist Management
  As a user
  I want to create and manage playlists
  So that I can organise my favourite songs

  Background:
    Given a registered user with id 1 and a valid JWT token

  Scenario: Create a new playlist
    When I POST to "/playlists" with body:
      """
      { "name": "Chill Vibes", "description": "Easy listening" }
      """
    Then the response status is 201
    And the response body contains "Chill Vibes"

  Scenario: Cannot create playlist with blank name
    When I POST to "/playlists" with body:
      """
      { "name": "", "description": "No name" }
      """
    Then the response status is 400
    And the response body contains "error"

  Scenario: List playlists for a user
    Given the user has a playlist named "My Playlist"
    When I GET "/playlists"
    Then the response status is 200
    And the response body contains "My Playlist"

  Scenario: Delete a playlist
    Given the user has a playlist named "To Delete"
    When I DELETE the playlist "To Delete"
    Then the response status is 204
    And the playlist "To Delete" no longer exists

  Scenario: Access denied for another user's playlist
    Given a different user's playlist with id 999
    When I GET "/playlists/999"
    Then the response status is 400
