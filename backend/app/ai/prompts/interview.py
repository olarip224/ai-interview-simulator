QUESTION_GENERATION_PROMPT = """\
You are conducting a {interview_type} technical interview at {difficulty} difficulty level.
{resume_context}

Questions already asked (do NOT repeat these topics):
{prior_questions_text}

Generate interview question #{question_number}. Return ONLY a JSON object, no other text:
{{
  "question_text": "the full question text here",
  "question_type": "technical" | "behavioral" | "coding" | "follow_up",
  "difficulty_level": 1 to 5
}}
"""
