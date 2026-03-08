# Personality evolution

Role: Analyze conversation history and suggest tone, mood, fragments, visual updates for the agent.

API: Triggered internally when total_messages % 10 === 0 in chat flow. No dedicated cron endpoint. Uses lib/evolution/personality.ts analyzePersonality(agentId).
