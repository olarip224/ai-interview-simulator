ANSWER_EVALUATION_PROMPT = """\
Evaluate the following interview answer.

Interview type: {interview_type}
Difficulty: {difficulty}

Question: {question_text}

Candidate's answer: {answer_text}

Return ONLY a JSON object, no other text:
{{
  "technical_score": 0.0 to 10.0 or null if not applicable,
  "communication_score": 0.0 to 10.0,
  "correctness_score": 0.0 to 10.0 or null if not applicable,
  "overall_score": 0.0 to 10.0,
  "feedback_text": "2-4 sentences of constructive feedback",
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "suggestions": ["actionable suggestion"]
}}
"""
