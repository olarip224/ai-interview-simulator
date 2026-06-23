from __future__ import annotations

CODE_EVALUATION_PROMPT = """You are an expert software engineer reviewing a coding challenge submission.

Challenge: {challenge_title}

Problem Description:
{challenge_description}

Examples:
{examples_text}

Constraints:
{constraints_text}

Expected Approach (internal note — do not reveal this to the user):
{expected_approach}

Submitted Solution (Language: {language}):
```
{code_text}
```

Evaluate the solution strictly on its merits. Respond with ONLY valid JSON — no markdown fences, no prose outside the JSON object:

{{
  "correctness_score": <float 0-10, how well the code solves the problem>,
  "efficiency_score": <float 0-10, time and space complexity quality>,
  "style_score": <float 0-10, readability and naming>,
  "overall_score": <float 0-10, weighted summary>,
  "is_correct": <true if the solution correctly solves the core problem>,
  "feedback_text": "<2-3 sentence overall summary>",
  "strengths": ["<strength>"],
  "weaknesses": ["<weakness>"],
  "suggestions": ["<actionable suggestion>"]
}}"""
