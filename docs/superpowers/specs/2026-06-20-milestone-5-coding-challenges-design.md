# Milestone 5: Coding Challenges — Design Spec

## Overview

Add a standalone coding challenge system to the AI Interview Simulator, integrated with the existing interview session flow. Users can browse curated (LeetCode-style) challenges, request AI-generated SWE challenges, and submit solutions in multiple languages. AI evaluates submissions with correctness judgment and time/space complexity analysis. Interview sessions are enhanced so that when a `CODING` type question is generated, a Challenge is automatically created and linked, giving users starter code and test cases.

## Architecture

Clean Architecture is maintained throughout: Router → Service → Repository → PostgreSQL. A new `ChallengeService(session, ai_client)` owns all challenge logic. `InterviewService` is extended to instantiate `ChallengeService` internally (no constructor change needed) and call it when generating CODING questions. Two new ORM models are added in migration `0004_add_challenges`.

## Data Model

### New table: `challenges`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | String(200) | e.g. "Two Sum" |
| `description` | Text | full problem statement |
| `difficulty` | String(20) | junior / mid / senior — reuses Difficulty enum values |
| `category` | String(50) | arrays / trees / dynamic_programming / strings / sorting / graphs |
| `source` | String(20) | curated / ai_generated — new ChallengeSource StrEnum |
| `starter_code` | JSONB | `{"python": "def solution(...):", "javascript": "...", "java": "..."}` |
| `test_cases` | JSONB | `[{"input": "...", "expected_output": "...", "explanation": "..."}]` |
| `constraints` | Text nullable | hints like "1 ≤ n ≤ 10⁴, O(n) time expected" |
| `created_at` | DateTime(tz) | |
| `updated_at` | DateTime(tz) | |

Indexes: `difficulty`, `category`, `source`.

### New table: `challenge_attempts`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `challenge_id` | UUID FK → challenges | no CASCADE — attempts survive challenge deletion |
| `user_id` | UUID FK → users | |
| `language` | String(20) | python / javascript / java / cpp / go |
| `code` | Text | submitted code |
| `is_correct` | Boolean nullable | AI assessment |
| `time_complexity` | String(50) nullable | e.g. "O(n log n)" |
| `space_complexity` | String(50) nullable | e.g. "O(1)" |
| `feedback_text` | Text | |
| `overall_score` | Float nullable | 0–10 |
| `created_at` | DateTime(tz) | |
| `updated_at` | DateTime(tz) | |

Indexes: `(challenge_id, user_id)`, `user_id`.

### Modification to existing `questions` table

Add nullable column: `challenge_id UUID FK → challenges` (no CASCADE). Populated when `generate_question` returns `question_type = "coding"`.

### New enums in `app/core/enums.py`

```python
class ChallengeSource(StrEnum):
    CURATED = "curated"
    AI_GENERATED = "ai_generated"

class ProgrammingLanguage(StrEnum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    JAVA = "java"
    CPP = "cpp"
    GO = "go"
```

## AI Layer

### New file: `app/ai/prompts/coding.py`

**`CHALLENGE_GENERATION_PROMPT`**

Format vars: `{difficulty}`, `{category_hint}` (empty string if not specified), `{languages}` (comma-separated, e.g. "python, javascript, java").

Instructs AI to return a JSON object only with these fields:
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume exactly one solution exists.",
  "category": "arrays",
  "constraints": "1 ≤ nums.length ≤ 10⁴. Each input has exactly one solution.",
  "test_cases": [
    {"input": "nums=[2,7,11,15], target=9", "expected_output": "[0,1]", "explanation": "nums[0]+nums[1]=9"},
    {"input": "nums=[3,2,4], target=6", "expected_output": "[1,2]", "explanation": "nums[1]+nums[2]=6"},
    {"input": "nums=[3,3], target=6", "expected_output": "[0,1]", "explanation": "nums[0]+nums[1]=6"}
  ],
  "starter_code": {
    "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    pass",
    "javascript": "function twoSum(nums, target) {\n    \n}",
    "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}"
  }
}
```

**`CODE_EVALUATION_PROMPT`**

Format vars: `{title}`, `{description}`, `{test_cases_text}`, `{language}`, `{code}`, `{constraints}`.

Instructs AI to evaluate the submitted code and return JSON only:
```json
{
  "is_correct": true,
  "time_complexity": "O(n)",
  "space_complexity": "O(n)",
  "overall_score": 8.5,
  "feedback_text": "Your solution correctly handles all three test cases using a hash map...",
  "suggestions": ["Consider handling empty input arrays", "The one-pass hash map approach is optimal here"]
}
```

### Additions to `app/ai/parsers.py`

Append to the existing file (after `FeedbackOutput`):

```python
class ChallengeOutput(BaseModel):
    title: str = ""
    description: str = ""
    category: str = "arrays"
    constraints: str = ""
    test_cases: list[dict] = []
    starter_code: dict[str, str] = {}

class CodeEvaluationOutput(BaseModel):
    is_correct: bool = False
    time_complexity: str = "O(?)"
    space_complexity: str = "O(?)"
    overall_score: float = 5.0
    feedback_text: str = ""
    suggestions: list[str] = []

    def model_post_init(self, __context: object) -> None:
        self.overall_score = max(0.0, min(10.0, self.overall_score))

def parse_challenge_output(raw: str) -> ChallengeOutput: ...
def parse_code_evaluation_output(raw: str) -> CodeEvaluationOutput: ...
```

Both parse functions use the existing `re.search(r"\{.*\}", raw, re.DOTALL)` fallback pattern already in `parsers.py`.

**AI constants:** model `claude-haiku-4-5-20251001`, max_tokens `2048` for generation, `1024` for evaluation.

## Schemas

New file: `app/schemas/challenge.py`

```python
class GenerateChallengeRequest(BaseModel):
    difficulty: str           # junior / mid / senior
    category: str | None = None

class ChallengeResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    title: str
    description: str
    difficulty: str
    category: str
    source: str
    starter_code: dict[str, str]
    test_cases: list[dict]
    constraints: str | None
    created_at: datetime

class SubmitAttemptRequest(BaseModel):
    language: str             # python / javascript / java / cpp / go
    code: str

class AttemptResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    challenge_id: uuid.UUID
    language: str
    is_correct: bool | None
    time_complexity: str | None
    space_complexity: str | None
    feedback_text: str
    overall_score: float | None
    created_at: datetime
```

## Repositories

New file: `app/repositories/challenge_repository.py`

```python
class ChallengeRepository(BaseRepository[Challenge]):
    async def list_challenges(
        self,
        *,
        difficulty: str | None = None,
        category: str | None = None,
        source: str | None = None,
    ) -> list[Challenge]:
        # builds WHERE clauses conditionally, orders by created_at desc

class ChallengeAttemptRepository(BaseRepository[ChallengeAttempt]):
    async def list_for_user_on_challenge(
        self, challenge_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ChallengeAttempt]:
        # ordered by created_at desc
```

## Service

New file: `app/services/challenge_service.py`

```python
class ChallengeService:
    def __init__(self, session: AsyncSession, ai_client: AIClient) -> None:
        self.session = session
        self.challenge_repo = ChallengeRepository(session)
        self.attempt_repo = ChallengeAttemptRepository(session)
        self.ai_client = ai_client  # TYPE_CHECKING only

    async def list_challenges(
        self, *, difficulty: str | None = None, category: str | None = None, source: str | None = None
    ) -> list[Challenge]: ...

    async def get_challenge(self, challenge_id: uuid.UUID) -> Challenge: ...
    # raises NotFoundError if missing

    async def generate_challenge(
        self, difficulty: str, category: str | None = None
    ) -> Challenge: ...
    # calls AI with CHALLENGE_GENERATION_PROMPT, saves with source=ai_generated

    async def submit_attempt(
        self,
        challenge_id: uuid.UUID,
        user_id: uuid.UUID,
        language: str,
        code: str,
    ) -> ChallengeAttempt: ...
    # fetches challenge (raises NotFoundError if missing), calls AI with
    # CODE_EVALUATION_PROMPT, saves and returns attempt

    async def list_user_attempts(
        self, challenge_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ChallengeAttempt]: ...
```

ORM models (`Challenge`, `ChallengeAttempt`) imported only under `TYPE_CHECKING`.

### InterviewService enhancement (`app/services/interview_service.py`)

In `__init__`, add after existing repo setup:
```python
from app.services.challenge_service import ChallengeService  # top-level import, not TYPE_CHECKING
self.challenge_service = ChallengeService(session, ai_client)
```

In `generate_question()`, after `await self.question_repo.create(...)`:
```python
if parsed.question_type == QuestionType.CODING:
    challenge = await self.challenge_service.generate_challenge(difficulty=s.difficulty)
    question.challenge_id = challenge.id
    await self.session.flush()
```

New method on `InterviewService`:
```python
async def get_question_challenge(
    self, session_id: uuid.UUID, question_id: uuid.UUID, user_id: uuid.UUID
) -> Challenge:
    s = await self.get_session(session_id, user_id)  # raises ForbiddenError if wrong user
    question = await self.question_repo.get_or_404(question_id)
    if question.session_id != session_id:
        raise ForbiddenError()
    if question.challenge_id is None:
        raise NotFoundError("Challenge")
    return await self.challenge_service.get_challenge(question.challenge_id)
```

## Endpoints

### New router: `app/api/v1/routers/challenges.py`

`APIRouter(tags=["challenges"])`, registered at `/api/v1/challenges` in `main.py`.

| Method | Path | Status | Response |
|---|---|---|---|
| `GET` | `/` | 200 | `list[ChallengeResponse]` — query params: `difficulty?`, `category?`, `source?` |
| `GET` | `/{challenge_id}` | 200 | `ChallengeResponse` |
| `POST` | `/generate` | 201 | `ChallengeResponse` — body: `GenerateChallengeRequest` |
| `POST` | `/{challenge_id}/attempts` | 201 | `AttemptResponse` — body: `SubmitAttemptRequest` |
| `GET` | `/{challenge_id}/attempts/me` | 200 | `list[AttemptResponse]` |

All routes require `CurrentUser`.

### Addition to `app/api/v1/routers/interviews.py`

```python
@router.get(
    "/sessions/{session_id}/questions/{question_id}/challenge",
    response_model=ChallengeResponse,
)
async def get_question_challenge(
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ChallengeResponse:
    challenge = await InterviewService(session, ai_client).get_question_challenge(
        session_id, question_id, current_user.id
    )
    return ChallengeResponse.model_validate(challenge)
```

## Seed Data (migration 0004)

10 curated challenges inserted in `upgrade()` using hardcoded UUIDs so `downgrade()` can delete them by ID. Each row includes: full description, 3 test cases, constraints, starter code in Python + JavaScript + Java.

| Title | Category | Difficulty |
|---|---|---|
| Two Sum | arrays | junior |
| Valid Palindrome | strings | junior |
| Climbing Stairs | dynamic_programming | junior |
| Merge Two Sorted Lists | sorting | junior |
| Valid Parentheses | strings | mid |
| Binary Search | arrays | mid |
| Maximum Subarray (Kadane's) | arrays | mid |
| Longest Substring Without Repeating Characters | strings | mid |
| Number of Islands | graphs | senior |
| Longest Common Subsequence | dynamic_programming | senior |

## Error Handling

- `NotFoundError` → 404 — challenge or attempt not found; CODING question has no linked challenge
- `ForbiddenError` → 403 — accessing another user's session/question
- Invalid `language` or `difficulty` values → 422 (Pydantic validation)
- AI failure → fallback defaults in `ChallengeOutput` / `CodeEvaluationOutput` (same pattern as existing parsers)

## Testing

**Unit tests** (`tests/unit/`):
- `test_coding_parsers.py` — TDD: valid JSON, JSON embedded in prose, fallback defaults, score clamping. Same pattern as `tests/unit/test_interview_parsers.py`.
- `test_challenge_service.py` — TDD: list (with/without filters), get (found + not found), generate (mocked AI), submit (mocked AI, checks all fields), list attempts, interview enhancement (generate_question creates challenge when CODING type).

**Integration tests** (`tests/integration/test_challenges.py`):
- List curated challenges returns seeded rows
- Get specific challenge by ID
- Generate AI challenge (mocked AI client via `app.dependency_overrides`)
- Submit attempt returns `AttemptResponse` with complexity fields
- List user attempts
- Get question challenge via interview endpoint after generating a CODING question
- Auth guard returns 403 without token
