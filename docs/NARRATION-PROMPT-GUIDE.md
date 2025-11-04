# Narration Prompt Tuning Guide 🎙️

## Overview

This guide explains how to customize the AI narration style by adjusting the system prompts in `src/lib/narration-prompts.ts`.

## Two-Stage Processing

The app uses a **two-stage AI processing pipeline** for optimal narration:

1. **Translation & Adaptation**: Translates content and adapts it for spoken narration (customizable style)
2. **TTS Formatting**: Formats the translated text specifically for Text-to-Speech engines to ensure correct pronunciation, natural pacing, and appropriate pauses

## Current Configuration

The current prompt produces:
- ✅ **Friendly yet professional** tone
- ✅ **Educational and explanatory** approach
- ✅ **Formal but approachable** language
- ✅ **Clear, valuable insights** for listeners
- ✅ **Natural speaking rhythm**
- ✅ **Mentor-like guidance**

## Prompt Structure

Located at **line 54-73** in `src/app/api/process-audio/route.ts`:

```typescript
const FRIENDLY_EDUCATIONAL_SYSTEM_PROMPT = `You are a professional educational content translator and narrator adapter...`;
```

## Key Components

### 1. **Tone** (Currently: Friendly yet professional)

```
- Tone: Friendly yet professional. Warm but not overly enthusiastic or effusive.
```

**Tuning options:**
- More formal: "Professional and authoritative. Clear and direct."
- More casual: "Friendly and conversational. Relaxed but informative."
- More energetic: "Engaging and dynamic. Enthusiastic but controlled."

### 2. **Approach** (Currently: Explanatory and educational)

```
- Approach: Explanatory and educational. Focus on clarity and comprehension.
```

**Tuning options:**
- Technical: "Technical and precise. Detailed explanations for advanced users."
- Beginner-friendly: "Simple and accessible. Explain concepts from first principles."
- Story-driven: "Narrative and contextual. Connect ideas through storytelling."

### 3. **Formality Level** (Currently: Respectful formal + conversational)

```
- Formality: Maintain a respectful, formal tone while staying approachable and conversational.
```

**Tuning options:**
- More formal: "Maintain professional academic tone throughout."
- More casual: "Use everyday language. Speak as you would to a colleague."
- Balanced: *(current setting)*

### 4. **Value Proposition** (Currently: Educational insights)

```
- Value: Ensure the listener learns something valuable and walks away with clear insights.
```

**Tuning options:**
- Action-oriented: "Focus on practical takeaways and actionable steps."
- Conceptual: "Emphasize understanding core concepts and principles."
- Problem-solving: "Center on solutions and troubleshooting approaches."

### 5. **Pacing** (Currently: Natural speaking rhythm)

```
- Pacing: Use natural speaking rhythm. Short, clear sentences work better for audio than complex structures.
```

**Tuning options:**
- Slower/deliberate: "Use longer pauses. Break down each point methodically."
- Faster/dynamic: "Maintain brisk pace. Cover points efficiently."
- Current: "Natural conversational speed with clear sentence breaks."

### 6. **Engagement Style** (Currently: Mentor-like)

```
- Engagement: Be inviting and helpful, like a knowledgeable mentor guiding a student.
```

**Tuning options:**
- Expert instructor: "Like a professor delivering a lecture."
- Peer educator: "Like a experienced colleague sharing tips."
- Coach: "Like a coach guiding someone through a process."

## Adaptation Rules

The current rules optimize for spoken delivery:

```
1. Translate accurately while adapting for spoken delivery (not written text)
2. Break down complex concepts into digestible explanations
3. Remove redundancy but preserve key information
4. Use connective phrases that sound natural when spoken
5. Replace written-style language with conversational equivalents
6. Maintain the educational intent and key learning points
7. Avoid exclamation marks and excessive excitement
```

### Customizing Rules

**Add rules for specific behaviors:**

```typescript
8. Include practical examples when explaining abstract concepts
9. Use analogies to make technical topics relatable
10. Pause naturally between major points (use "..." in text)
11. Repeat key terms for emphasis and clarity
```

**Remove rules if not needed:**
- Remove rule #7 if you want more enthusiasm
- Remove rule #4 if you want more direct, less conversational style

## Quick Tweaks

### More Warmth
```
- Tone: Warm and welcoming. Use encouraging language.
- Add rule: "Include positive reinforcement phrases naturally."
```

### More Authority
```
- Tone: Authoritative and confident. Assertive but not aggressive.
- Formality: Maintain formal professional tone consistently.
```

### More Energy
```
- Tone: Energetic and engaging. Dynamic delivery with varied inflection.
- Pacing: Brisk and lively. Keep momentum throughout.
- Remove: Rule #7 (allow exclamations for emphasis)
```

### More Clarity
```
- Approach: Crystal clear explanations. Define every term.
- Add rule: "Always define technical terms before using them."
- Add rule: "Use numbered steps for processes."
```

## Testing Changes

### 1. Make Prompt Changes
Edit `src/app/api/process-audio/route.ts` (lines 54-73)

### 2. Restart Server
```bash
pnpm dev
```

### 3. Test with Sample Audio
Use a consistent sample audio to compare results:
- Record 30-60 seconds explaining a concept
- Process with old prompt (save result)
- Make prompt changes
- Process again with new prompt
- Compare the two outputs

### 4. Iterate
- Listen to both versions
- Note what improved and what didn't
- Adjust specific guidelines
- Test again

## Common Adjustments

### "Too Robotic"
**Problem**: Output sounds stiff and unnatural

**Solution**:
```diff
- Tone: Professional and formal. Clear and precise.
+ Tone: Conversational and natural. Speak as in real conversation.
+ Add rule: "Use contractions (I'm, you're, it's) for natural flow"
```

### "Too Casual"
**Problem**: Not appropriate for professional tutorials

**Solution**:
```diff
- Tone: Casual and friendly. Very relaxed.
+ Tone: Professional yet approachable. Balanced formality.
- Remove: Rules about using slang or colloquialisms
```

### "Too Fast-Paced"
**Problem**: Listeners can't keep up

**Solution**:
```diff
+ Pacing: Deliberate and measured. Allow time for concepts to sink in.
+ Add rule: "Include brief pauses after important points"
+ Add rule: "Repeat key information using different words"
```

### "Not Engaging Enough"
**Problem**: Listeners lose interest

**Solution**:
```diff
+ Engagement: Create curiosity. Ask rhetorical questions.
+ Add rule: "Begin sections with interesting hooks or questions"
+ Add rule: "Use 'you' language to speak directly to listener"
```

### "Too Much Adaptation"
**Problem**: Changes original meaning too much

**Solution**:
```diff
+ Add rule: "Stay faithful to original content and intent"
+ Add rule: "Adapt style but preserve all technical details exactly"
- Remove or modify: Rules about removing redundancy
```

## Voice Complement

Remember: The prompt controls **text adaptation**, but the **TTS voice** also affects final output.

Current voice: **"coral"** (warm, clear, professional female voice)

Other OpenAI TTS-1 voices:
- `alloy`: Neutral, balanced
- `echo`: Male, warm, smooth
- `fable`: British accent, articulate
- `onyx`: Male, deep, authoritative
- `nova`: Female, friendly, expressive
- `shimmer`: Female, soft, gentle

To change voice, edit line 113 in `route.ts`:
```typescript
voice: "coral",  // Change to: alloy, echo, fable, onyx, nova, or shimmer
```

## Example: Custom Prompt for Technical Tutorials

```typescript
const TECHNICAL_TUTORIAL_PROMPT = `You are a senior software engineer creating technical tutorials. Your goal is to translate and adapt content for developers learning new concepts.

Style Guidelines:
- Tone: Clear and direct. Authoritative but not condescending.
- Approach: Technical precision balanced with accessibility.
- Formality: Professional developer-to-developer communication.
- Value: Provide practical, immediately applicable knowledge.
- Pacing: Methodical. Allow time to understand each concept.
- Engagement: Respect the listener's intelligence. No hand-holding.

Adaptation Rules:
1. Preserve all technical terms and code references exactly
2. Break complex algorithms into logical steps
3. Use developer-friendly language (e.g., "function" not "magic box")
4. Include mental models and analogies for abstract concepts
5. Assume basic programming knowledge, explain advanced topics
6. Use "we" language for collaborative feel ("Now we'll...")
7. Keep explanations concise - developers prefer efficiency

The result should sound like a knowledgeable colleague doing a code walkthrough.`;
```

## TTS Formatting Prompt

### What It Does

After translation, the text goes through a **TTS formatting stage** that:
- Adds commas and periods for natural pauses
- Writes out numbers as words ("25" → "twenty-five")
- Handles acronyms and technical terms for correct pronunciation
- Breaks long sentences into shorter, more breathable segments
- Adjusts pacing and rhythm for natural speech

### Configuration

The TTS formatting prompt is defined in `src/lib/narration-prompts.ts` as `TTS_FORMATTING_PROMPT`.

### Key Features

**Pacing Control:**
- Adds commas for breath points
- Uses ellipsis (...) for thoughtful pauses
- Breaks complex sentences into simpler ones

**Pronunciation:**
- Numbers written as words
- Acronyms spelled out if needed (API → A P I)
- Symbols replaced with words (& → and, % → percent)
- Phonetic spelling for difficult words

**Natural Speech:**
- Contractions for flow (I'm, you're, it's)
- Transitional phrases ("Now,", "Next,", "Here's the thing,")
- Sentence length optimized (10-25 words)

### Customizing TTS Formatting

To adjust how text is formatted for TTS, edit the `TTS_FORMATTING_PROMPT` constant in `src/lib/narration-prompts.ts`.

**Example adjustments:**

**For slower pace:**
```typescript
1. **Pacing and Pauses:**
   - Add MORE commas for frequent breath points
   - Use periods after every 8-12 words for long pauses
   - Add ellipsis (...) frequently for thoughtful pauses
```

**For technical content:**
```typescript
2. **Pronunciation:**
   - Always spell out acronyms with spaces (API → A P I, HTTP → H T T P)
   - Write code terms phonetically if needed
   - Spell out version numbers ("v3.2" → "version three point two")
```

**For casual style:**
```typescript
4. **Natural Speech Patterns:**
   - Use more contractions (can't, won't, shouldn't)
   - Include more discourse markers ("you know", "like", "actually")
   - Allow run-on sentences with commas for conversational flow
```

## Support

For issues or questions:
1. Check server logs for prompt-related errors
2. Test with shorter audio samples first
3. Compare outputs with different prompt versions
4. Document what works and what doesn't
5. Check both translation AND TTS formatting logs

---

**Last Updated**: October 30, 2025  
**Current Prompt Version**: v2.0 - Friendly Educational + TTS Formatting

