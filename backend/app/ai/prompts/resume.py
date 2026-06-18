RESUME_ANALYSIS_PROMPT = """\
You are an expert resume analyst. Extract structured information from the resume text below.

Respond ONLY with a JSON object in exactly this format — no prose, no markdown fences:
{{
  "skills": ["skill1", "skill2"],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "duration": "2020 - 2023",
      "description": "Brief description of responsibilities"
    }}
  ],
  "education": [
    {{
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "2020"
    }}
  ],
  "summary": "2-3 sentence professional summary of the candidate"
}}

Resume text:
{resume_text}
"""
