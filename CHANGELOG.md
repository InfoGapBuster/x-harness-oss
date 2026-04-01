# Changelog

## [0.2.0] - 2026-04-01

### Added
- Reply-trigger architecture with cached condition verification
- Verify API endpoint for LINE Harness integration
- Multi-condition gates (reply + like + repost + follow)
- Dashboard UI for reply-trigger gate creation

### Changed
- Engagement gate processing now uses `since_id` for reply detection
- Reduced X API costs from ~$86/mo to ~$3-5/mo per gate

### Fixed
- Removed hardcoded personal URL from MCP server

## [0.1.0] - 2026-03-26

### Added
- Initial MVP: Engagement Gates, Follower Management, Tags
- Scheduled Posts, Step Sequences
- TypeScript SDK, MCP Server, Dashboard
- Stealth design (jitter, rate limiting, template variation)
- LINE Harness integration (one-way tagging)
