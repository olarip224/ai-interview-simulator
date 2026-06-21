# Milestone 5: Coding Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone coding challenge system (browse/generate/submit) integrated with interview sessions so CODING-type questions automatically link to a generated `Challenge` with starter code and test cases.

**Architecture:** New `Challenge` + `ChallengeAttempt` ORM models, a `ChallengeService(session, ai_client)`, two AI prompts in `app/ai/prompts/coding.py`, two new parsers appended to `app/ai/parsers.py`, a challenges router with 5 endpoints, and a minimal `InterviewService` enhancement that calls `ChallengeService.generate_challenge` after generating a CODING-type question. The interview router gets one new endpoint for fetching the linked challenge.

**Tech Stack:** Python 3.12, FastAPI 0.115, SQLAlchemy 2.0 async/asyncpg, Pydantic v2, Alembic, `claude-haiku-4-5-20251001` via existing `AIClient` ABC.

## Global Constraints

- Python ≥ 3.12 built-in generics (`list[str]`, `X | None`) — never `List`, `Optional`
- All DB access async — `await` all queries; `asyncpg`; no sync `Session`
- `response_model=` on every route
- Services must not import SQLAlchemy ORM models at module runtime — use `TYPE_CHECKING` guard
- Never call `Base.metadata.create_all()` — Alembic only (migration `0004`)
- Routers never import or instantiate repositories directly — only services
- `ChallengeService(session, ai_client)` — exactly 2 constructor params
- AI model constant: `claude-haiku-4-5-20251001`; max_tokens: `2048` challenge generation, `1024` code evaluation
- All routes under `/api/v1/challenges`; new interview route under `/api/v1/interviews`
- Git repo root: `\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator`
- Branch: `feat/milestone-5-coding-challenges` (create before Task 1)
- Tests run via: `wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/ -v 2>&1 | tail -25"`

## File Structure

**New files:**
- `backend/app/models/challenge.py` — `Challenge`, `ChallengeAttempt` ORM models
- `backend/alembic/versions/0004_add_challenges.py` — DDL + 10 seed rows + `challenge_id` column on `questions`
- `backend/app/ai/prompts/coding.py` — `CHALLENGE_GENERATION_PROMPT`, `CODE_EVALUATION_PROMPT`
- `backend/app/schemas/challenge.py` — `GenerateChallengeRequest`, `ChallengeResponse`, `SubmitAttemptRequest`, `AttemptResponse`
- `backend/app/repositories/challenge_repository.py` — `ChallengeRepository`, `ChallengeAttemptRepository`
- `backend/app/services/challenge_service.py` — `ChallengeService`
- `backend/app/api/v1/routers/challenges.py` — 5 endpoints
- `backend/tests/unit/test_coding_parsers.py` — 6 parser unit tests
- `backend/tests/unit/test_challenge_service.py` — 8 unit tests (including interview enhancement)
- `backend/tests/integration/test_challenges.py` — 7 integration tests

**Modified files:**
- `backend/app/core/enums.py` — add `ChallengeSource`, `ProgrammingLanguage`
- `backend/app/models/interview.py` — add `challenge_id` nullable FK to `Question`
- `backend/app/ai/parsers.py` — append `ChallengeOutput`, `CodeEvaluationOutput`, 2 parse functions
- `backend/app/services/interview_service.py` — add `challenge_service`, enhance `generate_question`, add `get_question_challenge`
- `backend/app/api/v1/routers/interviews.py` — add `get_question_challenge` endpoint
- `backend/app/main.py` — import and register challenges router
- `backend/tests/conftest.py` — expand mock AI JSON to include challenge + evaluation fields; set `question_type: "coding"` for full interview enhancement coverage

---

### Task 1: ORM Models, Enums, and Alembic Migration

**Files:**
- Modify: `backend/app/core/enums.py`
- Create: `backend/app/models/challenge.py`
- Modify: `backend/app/models/interview.py`
- Create: `backend/alembic/versions/0004_add_challenges.py`

**Interfaces:**
- Produces:
  - `ChallengeSource` StrEnum — `CURATED = "curated"`, `AI_GENERATED = "ai_generated"`
  - `ProgrammingLanguage` StrEnum — `PYTHON`, `JAVASCRIPT`, `JAVA`, `CPP`, `GO`
  - `Challenge` ORM model with fields: `id`, `title`, `description`, `difficulty`, `category`, `source`, `starter_code` (JSONB), `test_cases` (JSONB), `constraints`, `created_at`, `updated_at`
  - `ChallengeAttempt` ORM model with fields: `id`, `challenge_id` (FK→challenges), `user_id` (FK→users), `language`, `code`, `is_correct`, `time_complexity`, `space_complexity`, `feedback_text`, `overall_score`, `created_at`, `updated_at`
  - `Question.challenge_id` — nullable UUID FK → challenges (no CASCADE)

- [ ] **Step 1: Create feature branch**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git checkout -b feat/milestone-5-coding-challenges
```

- [ ] **Step 2: Add enums to `backend/app/core/enums.py`**

Append to the end of the existing file (after `QuestionType`):

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

- [ ] **Step 3: Create `backend/app/models/challenge.py`**

```python
from __future__ import annotations

import uuid

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Challenge(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "challenges"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    starter_code: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    test_cases: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    constraints: Mapped[str | None] = mapped_column(Text, nullable=True)

    attempts: Mapped[list[ChallengeAttempt]] = relationship(
        "ChallengeAttempt", back_populates="challenge"
    )


class ChallengeAttempt(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "challenge_attempts"

    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(nullable=True)
    time_complexity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    space_complexity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    challenge: Mapped[Challenge] = relationship("Challenge", back_populates="attempts")
```

- [ ] **Step 4: Add `challenge_id` to `Question` in `backend/app/models/interview.py`**

In the `Question` class, after the `difficulty_level` column (line 65) and before the relationships, add:

```python
    challenge_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=True
    )
```

Also add `challenge` to the imports at the top of the file's `TYPE_CHECKING` block — it's not needed here since `Challenge` is in a separate model file and we don't add a relationship. Just the column is enough.

The `from_future__ import annotations` and `from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID` are already present. No import changes needed.

- [ ] **Step 5: Create `backend/alembic/versions/0004_add_challenges.py`**

```python
"""add challenges tables and seed data

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-20
"""
from __future__ import annotations

import json

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

# Hardcoded UUIDs so downgrade() can delete them by ID
_SEED_IDS = [
    "11111111-0000-0000-0000-000000000001",
    "11111111-0000-0000-0000-000000000002",
    "11111111-0000-0000-0000-000000000003",
    "11111111-0000-0000-0000-000000000004",
    "11111111-0000-0000-0000-000000000005",
    "11111111-0000-0000-0000-000000000006",
    "11111111-0000-0000-0000-000000000007",
    "11111111-0000-0000-0000-000000000008",
    "11111111-0000-0000-0000-000000000009",
    "11111111-0000-0000-0000-000000000010",
]

_SEED_DATA = [
    {
        "id": _SEED_IDS[0],
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume exactly one solution exists.",
        "difficulty": "junior",
        "category": "arrays",
        "source": "curated",
        "constraints": "2 <= nums.length <= 10^4. -10^9 <= nums[i] <= 10^9. Exactly one valid answer exists.",
        "test_cases": [
            {"input": "nums=[2,7,11,15], target=9", "expected_output": "[0,1]", "explanation": "nums[0]+nums[1]=9"},
            {"input": "nums=[3,2,4], target=6", "expected_output": "[1,2]", "explanation": "nums[1]+nums[2]=6"},
            {"input": "nums=[3,3], target=6", "expected_output": "[0,1]", "explanation": "nums[0]+nums[1]=6"},
        ],
        "starter_code": {
            "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    pass",
            "javascript": "function twoSum(nums, target) {\n    \n}",
            "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[1],
        "title": "Valid Palindrome",
        "description": "Given a string s, return true if it is a palindrome considering only alphanumeric characters and ignoring cases.",
        "difficulty": "junior",
        "category": "strings",
        "source": "curated",
        "constraints": "1 <= s.length <= 2*10^5. s consists only of printable ASCII characters.",
        "test_cases": [
            {"input": 's="A man, a plan, a canal: Panama"', "expected_output": "true", "explanation": "After filtering: amanaplanacanalpanama"},
            {"input": 's="race a car"', "expected_output": "false", "explanation": "raceacar is not a palindrome"},
            {"input": 's=" "', "expected_output": "true", "explanation": "Empty after filtering is a palindrome"},
        ],
        "starter_code": {
            "python": "def is_palindrome(s: str) -> bool:\n    pass",
            "javascript": "function isPalindrome(s) {\n    \n}",
            "java": "class Solution {\n    public boolean isPalindrome(String s) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[2],
        "title": "Climbing Stairs",
        "description": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. How many distinct ways can you climb to the top?",
        "difficulty": "junior",
        "category": "dynamic_programming",
        "source": "curated",
        "constraints": "1 <= n <= 45",
        "test_cases": [
            {"input": "n=2", "expected_output": "2", "explanation": "1+1 or 2"},
            {"input": "n=3", "expected_output": "3", "explanation": "1+1+1, 1+2, or 2+1"},
            {"input": "n=5", "expected_output": "8", "explanation": "8 distinct ways"},
        ],
        "starter_code": {
            "python": "def climb_stairs(n: int) -> int:\n    pass",
            "javascript": "function climbStairs(n) {\n    \n}",
            "java": "class Solution {\n    public int climbStairs(int n) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[3],
        "title": "Merge Two Sorted Lists",
        "description": "Merge two sorted linked lists and return the merged list sorted. Use the nodes from the two lists.",
        "difficulty": "junior",
        "category": "sorting",
        "source": "curated",
        "constraints": "0 <= number of nodes in each list <= 50. -100 <= Node.val <= 100. Both lists are sorted in non-decreasing order.",
        "test_cases": [
            {"input": "list1=[1,2,4], list2=[1,3,4]", "expected_output": "[1,1,2,3,4,4]", "explanation": "Merge in sorted order"},
            {"input": "list1=[], list2=[]", "expected_output": "[]", "explanation": "Both empty"},
            {"input": "list1=[], list2=[0]", "expected_output": "[0]", "explanation": "One empty"},
        ],
        "starter_code": {
            "python": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef merge_two_lists(l1, l2):\n    pass",
            "javascript": "function mergeTwoLists(l1, l2) {\n    \n}",
            "java": "class Solution {\n    public ListNode mergeTwoLists(ListNode l1, ListNode l2) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[4],
        "title": "Valid Parentheses",
        "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if brackets are closed in the correct order.",
        "difficulty": "mid",
        "category": "strings",
        "source": "curated",
        "constraints": "1 <= s.length <= 10^4. s consists of parentheses only '()[]{}'.",
        "test_cases": [
            {"input": 's="()"', "expected_output": "true", "explanation": "Valid pair"},
            {"input": 's="()[]{}"', "expected_output": "true", "explanation": "Multiple valid pairs"},
            {"input": 's="(]"', "expected_output": "false", "explanation": "Mismatched brackets"},
        ],
        "starter_code": {
            "python": "def is_valid(s: str) -> bool:\n    pass",
            "javascript": "function isValid(s) {\n    \n}",
            "java": "class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[5],
        "title": "Binary Search",
        "description": "Given an array of integers nums sorted in ascending order and an integer target, write a function to search target in nums. Return the index if found, otherwise return -1.",
        "difficulty": "mid",
        "category": "arrays",
        "source": "curated",
        "constraints": "1 <= nums.length <= 10^4. -10^4 < nums[i], target < 10^4. All integers in nums are unique. nums is sorted in ascending order.",
        "test_cases": [
            {"input": "nums=[-1,0,3,5,9,12], target=9", "expected_output": "4", "explanation": "9 is at index 4"},
            {"input": "nums=[-1,0,3,5,9,12], target=2", "expected_output": "-1", "explanation": "2 does not exist"},
            {"input": "nums=[5], target=5", "expected_output": "0", "explanation": "Single element match"},
        ],
        "starter_code": {
            "python": "def search(nums: list[int], target: int) -> int:\n    pass",
            "javascript": "function search(nums, target) {\n    \n}",
            "java": "class Solution {\n    public int search(int[] nums, int target) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[6],
        "title": "Maximum Subarray (Kadane's)",
        "description": "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
        "difficulty": "mid",
        "category": "arrays",
        "source": "curated",
        "constraints": "1 <= nums.length <= 10^5. -10^4 <= nums[i] <= 10^4.",
        "test_cases": [
            {"input": "nums=[-2,1,-3,4,-1,2,1,-5,4]", "expected_output": "6", "explanation": "[4,-1,2,1] has sum 6"},
            {"input": "nums=[1]", "expected_output": "1", "explanation": "Single element"},
            {"input": "nums=[5,4,-1,7,8]", "expected_output": "23", "explanation": "Whole array"},
        ],
        "starter_code": {
            "python": "def max_sub_array(nums: list[int]) -> int:\n    pass",
            "javascript": "function maxSubArray(nums) {\n    \n}",
            "java": "class Solution {\n    public int maxSubArray(int[] nums) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[7],
        "title": "Longest Substring Without Repeating Characters",
        "description": "Given a string s, find the length of the longest substring without repeating characters.",
        "difficulty": "mid",
        "category": "strings",
        "source": "curated",
        "constraints": "0 <= s.length <= 5*10^4. s consists of English letters, digits, symbols, and spaces.",
        "test_cases": [
            {"input": 's="abcabcbb"', "expected_output": "3", "explanation": "abc has length 3"},
            {"input": 's="bbbbb"', "expected_output": "1", "explanation": "b has length 1"},
            {"input": 's="pwwkew"', "expected_output": "3", "explanation": "wke has length 3"},
        ],
        "starter_code": {
            "python": "def length_of_longest_substring(s: str) -> int:\n    pass",
            "javascript": "function lengthOfLongestSubstring(s) {\n    \n}",
            "java": "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[8],
        "title": "Number of Islands",
        "description": "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
        "difficulty": "senior",
        "category": "graphs",
        "source": "curated",
        "constraints": "m == grid.length. n == grid[i].length. 1 <= m, n <= 300. grid[i][j] is '0' or '1'.",
        "test_cases": [
            {"input": 'grid=[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', "expected_output": "1", "explanation": "One large island"},
            {"input": 'grid=[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', "expected_output": "3", "explanation": "Three separate islands"},
            {"input": 'grid=[["1"]]', "expected_output": "1", "explanation": "Single land cell"},
        ],
        "starter_code": {
            "python": "def num_islands(grid: list[list[str]]) -> int:\n    pass",
            "javascript": "function numIslands(grid) {\n    \n}",
            "java": "class Solution {\n    public int numIslands(char[][] grid) {\n        \n    }\n}",
        },
    },
    {
        "id": _SEED_IDS[9],
        "title": "Longest Common Subsequence",
        "description": "Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0. A subsequence is a sequence derived by deleting some characters without changing the relative order.",
        "difficulty": "senior",
        "category": "dynamic_programming",
        "source": "curated",
        "constraints": "1 <= text1.length, text2.length <= 1000. text1 and text2 consist of only lowercase English characters.",
        "test_cases": [
            {"input": 'text1="abcde", text2="ace"', "expected_output": "3", "explanation": "LCS is 'ace'"},
            {"input": 'text1="abc", text2="abc"', "expected_output": "3", "explanation": "LCS is 'abc'"},
            {"input": 'text1="abc", text2="def"', "expected_output": "0", "explanation": "No common subsequence"},
        ],
        "starter_code": {
            "python": "def longest_common_subsequence(text1: str, text2: str) -> int:\n    pass",
            "javascript": "function longestCommonSubsequence(text1, text2) {\n    \n}",
            "java": "class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        \n    }\n}",
        },
    },
]


def upgrade() -> None:
    op.create_table(
        "challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("starter_code", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("test_cases", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("constraints", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_challenges_difficulty", "challenges", ["difficulty"])
    op.create_index("ix_challenges_category", "challenges", ["category"])
    op.create_index("ix_challenges_source", "challenges", ["source"])

    op.create_table(
        "challenge_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.String(20), nullable=False),
        sa.Column("code", sa.Text, nullable=False),
        sa.Column("is_correct", sa.Boolean, nullable=True),
        sa.Column("time_complexity", sa.String(50), nullable=True),
        sa.Column("space_complexity", sa.String(50), nullable=True),
        sa.Column("feedback_text", sa.Text, nullable=False, server_default=""),
        sa.Column("overall_score", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_challenge_attempts_challenge_user", "challenge_attempts", ["challenge_id", "user_id"])
    op.create_index("ix_challenge_attempts_user_id", "challenge_attempts", ["user_id"])

    op.add_column(
        "questions",
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_questions_challenge_id",
        "questions",
        "challenges",
        ["challenge_id"],
        ["id"],
    )

    # Insert seed data
    for row in _SEED_DATA:
        op.execute(
            sa.text(
                "INSERT INTO challenges (id, title, description, difficulty, category, source, "
                "starter_code, test_cases, constraints, created_at, updated_at) "
                "VALUES (:id, :title, :description, :difficulty, :category, :source, "
                ":starter_code, :test_cases, :constraints, now(), now())"
            ).bindparams(
                id=row["id"],
                title=row["title"],
                description=row["description"],
                difficulty=row["difficulty"],
                category=row["category"],
                source=row["source"],
                starter_code=json.dumps(row["starter_code"]),
                test_cases=json.dumps(row["test_cases"]),
                constraints=row["constraints"],
            )
        )


def downgrade() -> None:
    seed_ids = ", ".join(f"'{uid}'" for uid in _SEED_IDS)
    op.execute(sa.text(f"DELETE FROM challenges WHERE id IN ({seed_ids})"))
    op.drop_constraint("fk_questions_challenge_id", "questions", type_="foreignkey")
    op.drop_column("questions", "challenge_id")
    op.drop_index("ix_challenge_attempts_user_id", table_name="challenge_attempts")
    op.drop_index("ix_challenge_attempts_challenge_user", table_name="challenge_attempts")
    op.drop_table("challenge_attempts")
    op.drop_index("ix_challenges_source", table_name="challenges")
    op.drop_index("ix_challenges_category", table_name="challenges")
    op.drop_index("ix_challenges_difficulty", table_name="challenges")
    op.drop_table("challenges")
```

- [ ] **Step 6: Verify import chain (no DB required)**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && python3 -m py_compile app/models/challenge.py app/models/interview.py app/core/enums.py && echo OK"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/core/enums.py backend/app/models/challenge.py backend/app/models/interview.py backend/alembic/versions/0004_add_challenges.py
git commit -m "feat: ORM models, enums, and migration 0004 for coding challenges"
```

---

### Task 2: AI Prompts and Parsers (TDD)

**Files:**
- Create: `backend/tests/unit/test_coding_parsers.py` (write FIRST)
- Create: `backend/app/ai/prompts/coding.py`
- Modify: `backend/app/ai/parsers.py` (append)

**Interfaces:**
- Consumes: `app/ai/parsers.py` existing imports (`json`, `re`, `BaseModel`, `ValidationError`)
- Produces:
  - `CHALLENGE_GENERATION_PROMPT` (str, format vars: `{difficulty}`, `{category_hint}`, `{languages}`)
  - `CODE_EVALUATION_PROMPT` (str, format vars: `{title}`, `{description}`, `{test_cases_text}`, `{language}`, `{code}`, `{constraints}`)
  - `ChallengeOutput` Pydantic model — fields: `title: str = ""`, `description: str = ""`, `category: str = "arrays"`, `constraints: str = ""`, `test_cases: list[dict] = []`, `starter_code: dict[str, str] = {}`
  - `CodeEvaluationOutput` Pydantic model — fields: `is_correct: bool = False`, `time_complexity: str = "O(?)"`, `space_complexity: str = "O(?)"`, `overall_score: float = 5.0`, `feedback_text: str = ""`, `suggestions: list[str] = []`; `model_post_init` clamps `overall_score` to `[0.0, 10.0]`
  - `parse_challenge_output(raw: str) -> ChallengeOutput`
  - `parse_code_evaluation_output(raw: str) -> CodeEvaluationOutput`

- [ ] **Step 1: Write failing tests — create `backend/tests/unit/test_coding_parsers.py`**

```python
from __future__ import annotations

import pytest

from app.ai.parsers import (
    ChallengeOutput,
    CodeEvaluationOutput,
    parse_challenge_output,
    parse_code_evaluation_output,
)


def test_parse_challenge_valid_json():
    raw = """{
        "title": "Two Sum",
        "description": "Return indices that sum to target.",
        "category": "arrays",
        "constraints": "1 <= n <= 10^4",
        "test_cases": [{"input": "nums=[2,7], target=9", "expected_output": "[0,1]", "explanation": "sum 9"}],
        "starter_code": {"python": "def two_sum(nums, target): pass"}
    }"""
    result = parse_challenge_output(raw)
    assert result.title == "Two Sum"
    assert result.category == "arrays"
    assert len(result.test_cases) == 1
    assert "python" in result.starter_code


def test_parse_challenge_json_in_prose():
    raw = 'Here is your challenge: {"title": "Binary Search", "description": "Search in sorted array.", "category": "arrays", "constraints": "", "test_cases": [], "starter_code": {"python": "pass"}}'
    result = parse_challenge_output(raw)
    assert result.title == "Binary Search"
    assert result.category == "arrays"


def test_parse_challenge_fallback_on_invalid():
    result = parse_challenge_output("I cannot generate a challenge right now.")
    assert result.title == ""
    assert result.category == "arrays"
    assert result.test_cases == []
    assert result.starter_code == {}


def test_parse_evaluation_valid_json():
    raw = """{
        "is_correct": true,
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "overall_score": 8.5,
        "feedback_text": "Great use of hash map.",
        "suggestions": ["Handle empty input"]
    }"""
    result = parse_code_evaluation_output(raw)
    assert result.is_correct is True
    assert result.time_complexity == "O(n)"
    assert result.space_complexity == "O(1)"
    assert result.overall_score == pytest.approx(8.5)
    assert result.feedback_text == "Great use of hash map."
    assert result.suggestions == ["Handle empty input"]


def test_parse_evaluation_fallback_on_invalid():
    result = parse_code_evaluation_output("Unable to evaluate this code.")
    assert result.is_correct is False
    assert result.time_complexity == "O(?)"
    assert result.space_complexity == "O(?)"
    assert result.overall_score == pytest.approx(5.0)
    assert result.feedback_text == ""


def test_parse_evaluation_clamps_score():
    raw = '{"is_correct": true, "time_complexity": "O(n)", "space_complexity": "O(1)", "overall_score": 15.0, "feedback_text": "great", "suggestions": []}'
    result = parse_code_evaluation_output(raw)
    assert result.overall_score <= 10.0

    raw_neg = '{"is_correct": false, "time_complexity": "O(n^2)", "space_complexity": "O(1)", "overall_score": -3.0, "feedback_text": "bad", "suggestions": []}'
    result_neg = parse_code_evaluation_output(raw_neg)
    assert result_neg.overall_score >= 0.0
```

- [ ] **Step 2: Run tests to confirm 6 failures**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/test_coding_parsers.py -v 2>&1 | tail -15"
```

Expected: 6 FAILED with `ImportError: cannot import name 'ChallengeOutput'`

- [ ] **Step 3: Create `backend/app/ai/prompts/coding.py`**

```python
CHALLENGE_GENERATION_PROMPT = """\
You are a technical interviewer creating a coding challenge.

Difficulty: {difficulty}
{category_hint}
Provide starter code for these languages: {languages}

Return ONLY a JSON object, no other text:
{{
  "title": "challenge name",
  "description": "full problem statement with examples",
  "category": "arrays" | "strings" | "trees" | "dynamic_programming" | "sorting" | "graphs",
  "constraints": "complexity hints and input bounds",
  "test_cases": [
    {{"input": "...", "expected_output": "...", "explanation": "..."}}
  ],
  "starter_code": {{
    "python": "def function_name(params):\\n    pass",
    "javascript": "function functionName(params) {{\\n    \\n}}",
    "java": "class Solution {{\\n    public ReturnType methodName(ParamType param) {{\\n        \\n    }}\\n}}"
  }}
}}

Generate exactly 3 test cases. Include starter function signatures with correct parameter names.
"""

CODE_EVALUATION_PROMPT = """\
You are a code reviewer evaluating a solution to a coding challenge.

Challenge: {title}
Description: {description}
Constraints: {constraints}

Test cases:
{test_cases_text}

Submitted code ({language}):
{code}

Evaluate the solution and return ONLY a JSON object, no other text:
{{
  "is_correct": true | false,
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "overall_score": 0.0 to 10.0,
  "feedback_text": "detailed explanation of the solution's correctness and approach",
  "suggestions": ["improvement suggestion 1", "improvement suggestion 2"]
}}

Score 0-10: 10 = optimal correct solution, 7-9 = correct but suboptimal, 4-6 = partially correct, 0-3 = incorrect.
"""
```

- [ ] **Step 4: Append to `backend/app/ai/parsers.py`**

Add after the last function `parse_feedback_output` (at the end of the file):

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


def parse_challenge_output(raw: str) -> ChallengeOutput:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return ChallengeOutput()
    try:
        data = json.loads(match.group())
        return ChallengeOutput.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return ChallengeOutput()


def parse_code_evaluation_output(raw: str) -> CodeEvaluationOutput:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return CodeEvaluationOutput()
    try:
        data = json.loads(match.group())
        return CodeEvaluationOutput.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return CodeEvaluationOutput()
```

- [ ] **Step 5: Run tests — confirm 6 pass**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/test_coding_parsers.py -v 2>&1 | tail -15"
```

Expected: 6 PASSED

- [ ] **Step 6: Run full unit suite — confirm no regressions**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/ -v 2>&1 | tail -10"
```

Expected: all prior tests still pass (72+ pass).

- [ ] **Step 7: Commit**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/ai/prompts/coding.py backend/app/ai/parsers.py backend/tests/unit/test_coding_parsers.py
git commit -m "feat: coding challenge AI prompts and parsers (TDD)"
```

---

### Task 3: Challenge Schemas

**Files:**
- Create: `backend/app/schemas/challenge.py`

**Interfaces:**
- Produces:
  - `GenerateChallengeRequest` — fields: `difficulty: str`, `category: str | None = None`
  - `ChallengeResponse` — `from_attributes=True`; fields: `id`, `title`, `description`, `difficulty`, `category`, `source`, `starter_code: dict[str, str]`, `test_cases: list[dict]`, `constraints: str | None`, `created_at`
  - `SubmitAttemptRequest` — fields: `language: str`, `code: str`
  - `AttemptResponse` — `from_attributes=True`; fields: `id`, `challenge_id`, `language`, `is_correct: bool | None`, `time_complexity: str | None`, `space_complexity: str | None`, `feedback_text: str`, `overall_score: float | None`, `created_at`

- [ ] **Step 1: Create `backend/app/schemas/challenge.py`**

```python
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class GenerateChallengeRequest(BaseModel):
    difficulty: str
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
    language: str
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

- [ ] **Step 2: Verify syntax**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && python3 -m py_compile app/schemas/challenge.py && echo OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/schemas/challenge.py
git commit -m "feat: challenge Pydantic schemas"
```

---

### Task 4: Challenge Repositories

**Files:**
- Create: `backend/app/repositories/challenge_repository.py`

**Interfaces:**
- Consumes: `BaseRepository` from `app.repositories.base`; `Challenge`, `ChallengeAttempt` ORM models (runtime imports — they're used directly in queries, not under TYPE_CHECKING)
- Produces:
  - `ChallengeRepository(session)` with:
    - `model = Challenge`
    - `list_challenges(*, difficulty, category, source) -> list[Challenge]`
  - `ChallengeAttemptRepository(session)` with:
    - `model = ChallengeAttempt`
    - `list_for_user_on_challenge(challenge_id, user_id) -> list[ChallengeAttempt]`
  - Both inherit `get()`, `get_or_404()`, `create(**kwargs)`, `delete()` from `BaseRepository`

- [ ] **Step 1: Create `backend/app/repositories/challenge_repository.py`**

```python
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.challenge import Challenge, ChallengeAttempt
from app.repositories.base import BaseRepository


class ChallengeRepository(BaseRepository[Challenge]):
    model = Challenge

    async def list_challenges(
        self,
        *,
        difficulty: str | None = None,
        category: str | None = None,
        source: str | None = None,
    ) -> list[Challenge]:
        stmt = select(Challenge).order_by(Challenge.created_at.desc())
        if difficulty is not None:
            stmt = stmt.where(Challenge.difficulty == difficulty)
        if category is not None:
            stmt = stmt.where(Challenge.category == category)
        if source is not None:
            stmt = stmt.where(Challenge.source == source)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ChallengeAttemptRepository(BaseRepository[ChallengeAttempt]):
    model = ChallengeAttempt

    async def list_for_user_on_challenge(
        self, challenge_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ChallengeAttempt]:
        result = await self.session.execute(
            select(ChallengeAttempt)
            .where(
                ChallengeAttempt.challenge_id == challenge_id,
                ChallengeAttempt.user_id == user_id,
            )
            .order_by(ChallengeAttempt.created_at.desc())
        )
        return list(result.scalars().all())
```

- [ ] **Step 2: Verify syntax**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && python3 -m py_compile app/repositories/challenge_repository.py && echo OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/repositories/challenge_repository.py
git commit -m "feat: ChallengeRepository and ChallengeAttemptRepository"
```

---

### Task 5: ChallengeService (TDD)

**Files:**
- Create: `backend/tests/unit/test_challenge_service.py` (write FIRST)
- Create: `backend/app/services/challenge_service.py`

**Interfaces:**
- Consumes:
  - `ChallengeRepository.list_challenges(*, difficulty, category, source) -> list[Challenge]`
  - `ChallengeRepository.get_or_404(id) -> Challenge` (raises `NotFoundError`)
  - `ChallengeRepository.create(**kwargs) -> Challenge`
  - `ChallengeAttemptRepository.list_for_user_on_challenge(challenge_id, user_id) -> list[ChallengeAttempt]`
  - `ChallengeAttemptRepository.create(**kwargs) -> ChallengeAttempt`
  - `AIClient.complete(messages, *, model, max_tokens) -> str`
  - `parse_challenge_output(raw) -> ChallengeOutput`
  - `parse_code_evaluation_output(raw) -> CodeEvaluationOutput`
  - `CHALLENGE_GENERATION_PROMPT`, `CODE_EVALUATION_PROMPT`
- Produces:
  - `ChallengeService(session: AsyncSession, ai_client: AIClient)` with:
    - `list_challenges(*, difficulty, category, source) -> list[Challenge]`
    - `get_challenge(challenge_id) -> Challenge`
    - `generate_challenge(difficulty, category=None) -> Challenge`
    - `submit_attempt(challenge_id, user_id, language, code) -> ChallengeAttempt`
    - `list_user_attempts(challenge_id, user_id) -> list[ChallengeAttempt]`

- [ ] **Step 1: Write failing tests — create `backend/tests/unit/test_challenge_service.py`**

```python
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.enums import Difficulty, InterviewType, SessionStatus
from app.core.exceptions import NotFoundError
from app.services.challenge_service import ChallengeService

_USER_ID = uuid.uuid4()
_CHALLENGE_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()


def _make_service():
    session = AsyncMock()
    ai_client = AsyncMock()
    svc = ChallengeService(session, ai_client)
    svc.challenge_repo = AsyncMock()
    svc.attempt_repo = AsyncMock()
    return svc, ai_client


def _make_challenge(source="curated", difficulty="mid", category="arrays"):
    c = MagicMock()
    c.id = _CHALLENGE_ID
    c.title = "Two Sum"
    c.description = "Return indices."
    c.difficulty = difficulty
    c.category = category
    c.source = source
    c.constraints = "1 <= n <= 10^4"
    c.test_cases = [{"input": "nums=[2,7]", "expected_output": "[0,1]", "explanation": "sum 9"}]
    c.starter_code = {"python": "def two_sum(nums, target): pass"}
    return c


@pytest.mark.asyncio
async def test_list_challenges_no_filter():
    svc, _ = _make_service()
    challenges = [_make_challenge(), _make_challenge(source="ai_generated")]
    svc.challenge_repo.list_challenges = AsyncMock(return_value=challenges)
    result = await svc.list_challenges()
    svc.challenge_repo.list_challenges.assert_awaited_once_with(
        difficulty=None, category=None, source=None
    )
    assert len(result) == 2


@pytest.mark.asyncio
async def test_list_challenges_with_filter():
    svc, _ = _make_service()
    svc.challenge_repo.list_challenges = AsyncMock(return_value=[_make_challenge()])
    result = await svc.list_challenges(difficulty="junior", category="arrays", source="curated")
    svc.challenge_repo.list_challenges.assert_awaited_once_with(
        difficulty="junior", category="arrays", source="curated"
    )
    assert len(result) == 1


@pytest.mark.asyncio
async def test_get_challenge_found():
    svc, _ = _make_service()
    challenge = _make_challenge()
    svc.challenge_repo.get_or_404 = AsyncMock(return_value=challenge)
    result = await svc.get_challenge(_CHALLENGE_ID)
    svc.challenge_repo.get_or_404.assert_awaited_once_with(_CHALLENGE_ID)
    assert result is challenge


@pytest.mark.asyncio
async def test_get_challenge_not_found():
    svc, _ = _make_service()
    svc.challenge_repo.get_or_404 = AsyncMock(side_effect=NotFoundError("Challenge"))
    with pytest.raises(NotFoundError):
        await svc.get_challenge(_CHALLENGE_ID)


@pytest.mark.asyncio
async def test_generate_challenge_calls_ai_and_saves():
    svc, ai_client = _make_service()
    ai_client.complete = AsyncMock(
        return_value='{"title": "FizzBuzz", "description": "Classic FizzBuzz.", "category": "arrays", "constraints": "1 <= n <= 100", "test_cases": [], "starter_code": {"python": "def fizz_buzz(n): pass"}}'
    )
    saved = _make_challenge(source="ai_generated")
    svc.challenge_repo.create = AsyncMock(return_value=saved)

    result = await svc.generate_challenge(difficulty="junior", category="arrays")

    ai_client.complete.assert_awaited_once()
    svc.challenge_repo.create.assert_awaited_once()
    call_kwargs = svc.challenge_repo.create.call_args.kwargs
    assert call_kwargs["source"] == "ai_generated"
    assert call_kwargs["difficulty"] == "junior"
    assert result is saved


@pytest.mark.asyncio
async def test_submit_attempt_saves_evaluation():
    svc, ai_client = _make_service()
    challenge = _make_challenge()
    svc.challenge_repo.get_or_404 = AsyncMock(return_value=challenge)
    ai_client.complete = AsyncMock(
        return_value='{"is_correct": true, "time_complexity": "O(n)", "space_complexity": "O(n)", "overall_score": 9.0, "feedback_text": "Excellent.", "suggestions": []}'
    )
    saved_attempt = MagicMock()
    saved_attempt.is_correct = True
    saved_attempt.time_complexity = "O(n)"
    saved_attempt.overall_score = 9.0
    svc.attempt_repo.create = AsyncMock(return_value=saved_attempt)

    result = await svc.submit_attempt(_CHALLENGE_ID, _USER_ID, "python", "def two_sum(nums, target):\n    pass")

    ai_client.complete.assert_awaited_once()
    svc.attempt_repo.create.assert_awaited_once()
    call_kwargs = svc.attempt_repo.create.call_args.kwargs
    assert call_kwargs["challenge_id"] == _CHALLENGE_ID
    assert call_kwargs["user_id"] == _USER_ID
    assert call_kwargs["language"] == "python"
    assert call_kwargs["is_correct"] is True
    assert call_kwargs["time_complexity"] == "O(n)"
    assert result is saved_attempt


@pytest.mark.asyncio
async def test_list_user_attempts():
    svc, _ = _make_service()
    attempts = [MagicMock(), MagicMock()]
    svc.attempt_repo.list_for_user_on_challenge = AsyncMock(return_value=attempts)
    result = await svc.list_user_attempts(_CHALLENGE_ID, _USER_ID)
    svc.attempt_repo.list_for_user_on_challenge.assert_awaited_once_with(_CHALLENGE_ID, _USER_ID)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_generate_coding_question_links_challenge():
    """InterviewService.generate_question auto-creates a challenge for CODING type."""
    from app.services.interview_service import InterviewService

    db = AsyncMock()
    ai = AsyncMock()
    svc = InterviewService(db, ai)
    svc.session_repo = AsyncMock()
    svc.question_repo = AsyncMock()
    svc.resume_repo = AsyncMock()
    svc.challenge_service = AsyncMock()

    mock_iv_session = MagicMock()
    mock_iv_session.user_id = _USER_ID
    mock_iv_session.status = SessionStatus.ACTIVE
    mock_iv_session.interview_type = InterviewType.SWE
    mock_iv_session.difficulty = Difficulty.MID
    mock_iv_session.resume_id = None
    svc.session_repo.get_or_404 = AsyncMock(return_value=mock_iv_session)
    svc.question_repo.list_for_session = AsyncMock(return_value=[])
    svc.question_repo.get_next_sequence = AsyncMock(return_value=1)

    ai.complete = AsyncMock(
        return_value='{"question_text": "Implement BFS", "question_type": "coding", "difficulty_level": 4}'
    )

    mock_question = MagicMock()
    mock_question.challenge_id = None
    svc.question_repo.create = AsyncMock(return_value=mock_question)

    mock_challenge = MagicMock()
    mock_challenge.id = uuid.uuid4()
    svc.challenge_service.generate_challenge = AsyncMock(return_value=mock_challenge)

    await svc.generate_question(_SESSION_ID, _USER_ID)

    svc.challenge_service.generate_challenge.assert_awaited_once_with(difficulty="mid")
    assert mock_question.challenge_id == mock_challenge.id
```

- [ ] **Step 2: Run tests to confirm 8 failures**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/test_challenge_service.py -v 2>&1 | tail -15"
```

Expected: 8 FAILED with `ImportError: cannot import name 'ChallengeService'`

- [ ] **Step 3: Create `backend/app/services/challenge_service.py`**

```python
from __future__ import annotations

import json
import uuid
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.parsers import parse_challenge_output, parse_code_evaluation_output
from app.ai.prompts.coding import CHALLENGE_GENERATION_PROMPT, CODE_EVALUATION_PROMPT
from app.core.enums import ChallengeSource
from app.repositories.challenge_repository import ChallengeAttemptRepository, ChallengeRepository

if TYPE_CHECKING:
    from app.ai.client import AIClient
    from app.models.challenge import Challenge, ChallengeAttempt

_CHALLENGE_MODEL = "claude-haiku-4-5-20251001"
_GENERATION_MAX_TOKENS = 2048
_EVALUATION_MAX_TOKENS = 1024

_LANGUAGES = "python, javascript, java, cpp, go"


class ChallengeService:
    def __init__(self, session: AsyncSession, ai_client: AIClient) -> None:
        self.session = session
        self.challenge_repo = ChallengeRepository(session)
        self.attempt_repo = ChallengeAttemptRepository(session)
        self.ai_client = ai_client

    async def list_challenges(
        self,
        *,
        difficulty: str | None = None,
        category: str | None = None,
        source: str | None = None,
    ) -> list[Challenge]:
        return await self.challenge_repo.list_challenges(
            difficulty=difficulty, category=category, source=source
        )

    async def get_challenge(self, challenge_id: uuid.UUID) -> Challenge:
        return await self.challenge_repo.get_or_404(challenge_id)

    async def generate_challenge(
        self, difficulty: str, category: str | None = None
    ) -> Challenge:
        category_hint = f"Category: {category}." if category else ""
        prompt = CHALLENGE_GENERATION_PROMPT.format(
            difficulty=difficulty,
            category_hint=category_hint,
            languages=_LANGUAGES,
        )
        raw = await self.ai_client.complete(
            [{"role": "user", "content": prompt}],
            model=_CHALLENGE_MODEL,
            max_tokens=_GENERATION_MAX_TOKENS,
        )
        parsed = parse_challenge_output(raw)
        return await self.challenge_repo.create(
            title=parsed.title or f"{difficulty.capitalize()} coding challenge",
            description=parsed.description or "Solve the problem as described.",
            difficulty=difficulty,
            category=parsed.category,
            source=ChallengeSource.AI_GENERATED,
            starter_code=parsed.starter_code,
            test_cases=parsed.test_cases,
            constraints=parsed.constraints or None,
        )

    async def submit_attempt(
        self,
        challenge_id: uuid.UUID,
        user_id: uuid.UUID,
        language: str,
        code: str,
    ) -> ChallengeAttempt:
        challenge = await self.challenge_repo.get_or_404(challenge_id)
        test_cases_text = "\n".join(
            f"Input: {tc.get('input', '')} → Output: {tc.get('expected_output', '')}"
            for tc in (challenge.test_cases or [])
        )
        prompt = CODE_EVALUATION_PROMPT.format(
            title=challenge.title,
            description=challenge.description,
            test_cases_text=test_cases_text or "No test cases provided.",
            language=language,
            code=code,
            constraints=challenge.constraints or "No specific constraints.",
        )
        raw = await self.ai_client.complete(
            [{"role": "user", "content": prompt}],
            model=_CHALLENGE_MODEL,
            max_tokens=_EVALUATION_MAX_TOKENS,
        )
        ev = parse_code_evaluation_output(raw)
        return await self.attempt_repo.create(
            challenge_id=challenge_id,
            user_id=user_id,
            language=language,
            code=code,
            is_correct=ev.is_correct,
            time_complexity=ev.time_complexity,
            space_complexity=ev.space_complexity,
            feedback_text=ev.feedback_text,
            overall_score=ev.overall_score,
        )

    async def list_user_attempts(
        self, challenge_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ChallengeAttempt]:
        return await self.attempt_repo.list_for_user_on_challenge(challenge_id, user_id)
```

- [ ] **Step 4: Run tests — confirm 8 pass**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/test_challenge_service.py -v 2>&1 | tail -15"
```

Expected: 8 PASSED

Note: `test_generate_coding_question_links_challenge` imports `InterviewService` which at this point does NOT yet have `self.challenge_service`. That test will FAIL until Task 6. This is expected — it tests behavior added in Task 6. The test for the interview enhancement belongs here by spec but its implementation lands in Task 6. Run only the other 7 tests in this step, or accept that 1 test fails until Task 6.

Alternatively, run only the `ChallengeService` tests:

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/test_challenge_service.py -k 'not test_generate_coding_question' -v 2>&1 | tail -15"
```

Expected: 7 PASSED

- [ ] **Step 5: Run full unit suite**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/ -v 2>&1 | tail -10"
```

Expected: all prior passing tests still pass.

- [ ] **Step 6: Commit**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/services/challenge_service.py backend/tests/unit/test_challenge_service.py
git commit -m "feat: ChallengeService (TDD)"
```

---

### Task 6: Router, InterviewService Enhancement, App Wiring, and Integration Tests

**Files:**
- Create: `backend/app/api/v1/routers/challenges.py`
- Modify: `backend/app/api/v1/routers/interviews.py` — add `get_question_challenge` endpoint
- Modify: `backend/app/services/interview_service.py` — add `challenge_service`, enhance `generate_question`, add `get_question_challenge`
- Modify: `backend/app/main.py` — import and register challenges router
- Modify: `backend/tests/conftest.py` — update mock AI JSON
- Create: `backend/tests/integration/test_challenges.py`

**Interfaces:**
- Consumes (from earlier tasks):
  - `ChallengeService(session, ai_client)` — constructor and all 5 methods
  - `ChallengeResponse`, `AttemptResponse`, `GenerateChallengeRequest`, `SubmitAttemptRequest` from `app.schemas.challenge`
  - `InterviewService.get_question_challenge(session_id, question_id, user_id) -> Challenge` (new method, defined in this task)

- [ ] **Step 1: Create `backend/app/api/v1/routers/challenges.py`**

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.ai.client import AIClient
from app.ai.dependencies import get_ai_client
from app.dependencies import DB, CurrentUser
from app.schemas.challenge import (
    AttemptResponse,
    ChallengeResponse,
    GenerateChallengeRequest,
    SubmitAttemptRequest,
)
from app.services.challenge_service import ChallengeService

router = APIRouter(tags=["challenges"])


@router.get("", response_model=list[ChallengeResponse])
async def list_challenges(
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
    difficulty: str | None = None,
    category: str | None = None,
    source: str | None = None,
) -> list[ChallengeResponse]:
    challenges = await ChallengeService(session, ai_client).list_challenges(
        difficulty=difficulty, category=category, source=source
    )
    return [ChallengeResponse.model_validate(c) for c in challenges]


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ChallengeResponse:
    challenge = await ChallengeService(session, ai_client).get_challenge(challenge_id)
    return ChallengeResponse.model_validate(challenge)


@router.post("/generate", response_model=ChallengeResponse, status_code=201)
async def generate_challenge(
    data: GenerateChallengeRequest,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ChallengeResponse:
    challenge = await ChallengeService(session, ai_client).generate_challenge(
        difficulty=data.difficulty, category=data.category
    )
    return ChallengeResponse.model_validate(challenge)


@router.post("/{challenge_id}/attempts", response_model=AttemptResponse, status_code=201)
async def submit_attempt(
    challenge_id: uuid.UUID,
    data: SubmitAttemptRequest,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> AttemptResponse:
    attempt = await ChallengeService(session, ai_client).submit_attempt(
        challenge_id, current_user.id, data.language, data.code
    )
    return AttemptResponse.model_validate(attempt)


@router.get("/{challenge_id}/attempts/me", response_model=list[AttemptResponse])
async def list_my_attempts(
    challenge_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> list[AttemptResponse]:
    attempts = await ChallengeService(session, ai_client).list_user_attempts(
        challenge_id, current_user.id
    )
    return [AttemptResponse.model_validate(a) for a in attempts]
```

- [ ] **Step 2: Add `get_question_challenge` method to `InterviewService`**

In `backend/app/services/interview_service.py`:

**At the top of the file**, add this import (not under `TYPE_CHECKING`):
```python
from app.services.challenge_service import ChallengeService
```

**In `__init__`**, after the line `self.ai_client = ai_client`, add:
```python
        self.challenge_service = ChallengeService(session, ai_client)
```

**In `generate_question`**, after `return await self.question_repo.create(...)` — but the create is not a `return` any more; restructure as:

Replace the final block of `generate_question` (the `return await self.question_repo.create(...)` line) with:

```python
        question = await self.question_repo.create(
            session_id=session_id,
            sequence_order=next_seq,
            question_text=parsed.question_text,
            question_type=parsed.question_type,
            difficulty_level=parsed.difficulty_level,
        )
        if parsed.question_type == QuestionType.CODING:
            challenge = await self.challenge_service.generate_challenge(difficulty=s.difficulty)
            question.challenge_id = challenge.id
            await self.session.flush()
        return question
```

**Add this import** at the top of the existing imports block (since `QuestionType` needs to be imported — check if it already is):

`QuestionType` needs to be imported from `app.core.enums`. Add it to the existing enums import line:

```python
from app.core.enums import Difficulty, InterviewType, QuestionType, SessionStatus
```

**Append `get_question_challenge` method** to the `InterviewService` class (after `get_session_feedback_detail`):

```python
    async def get_question_challenge(
        self,
        session_id: uuid.UUID,
        question_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Challenge:
        await self.get_session(session_id, user_id)
        question = await self.question_repo.get_or_404(question_id)
        if question.session_id != session_id:
            raise ForbiddenError()
        if question.challenge_id is None:
            raise NotFoundError("Challenge")
        return await self.challenge_service.get_challenge(question.challenge_id)
```

Add `Challenge` to the `TYPE_CHECKING` import block in `interview_service.py`:

```python
if TYPE_CHECKING:
    from app.ai.client import AIClient
    from app.models.interview import Answer, Feedback, InterviewSession, Question
    from app.models.challenge import Challenge
```

- [ ] **Step 3: Add `get_question_challenge` endpoint to `backend/app/api/v1/routers/interviews.py`**

Add the following import at the top (with other schema imports):
```python
from app.schemas.challenge import ChallengeResponse
```

Append the following endpoint to the end of the router file:

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

- [ ] **Step 4: Register challenges router in `backend/app/main.py`**

Add import at the top alongside other router imports:
```python
from app.api.v1.routers import challenges as challenges_router
```

Add the `include_router` call after the analytics router registration:
```python
    app.include_router(
        challenges_router.router,
        prefix=f"{settings.API_PREFIX}/challenges",
    )
```

- [ ] **Step 5: Update `backend/tests/conftest.py` mock AI response**

Replace the `mock_ai.complete = AsyncMock(return_value='...')` line with the combined JSON that satisfies all parsers (question, feedback, resume, challenge, evaluation):

```python
    mock_ai.complete = AsyncMock(
        return_value='{"question_text":"Tell me about yourself","question_type":"coding","difficulty_level":3,"skills":["Python"],"experience":[],"education":[],"summary":"Test.","overall_score":8.0,"feedback_text":"Good answer.","strengths":["Clear"],"weaknesses":["Detail"],"suggestions":["Elaborate"],"title":"Two Sum","description":"Return indices that add up to target.","category":"arrays","constraints":"1 <= n <= 10^4","test_cases":[{"input":"nums=[2,7],target=9","expected_output":"[0,1]","explanation":"sum is 9"}],"starter_code":{"python":"def two_sum(nums, target): pass"},"is_correct":true,"time_complexity":"O(n)","space_complexity":"O(n)"}'
    )
```

Note: `question_type: "coding"` means every `generate_question` in integration tests also calls `generate_challenge` (a second AI call to the mock). This is intentional — it exercises the full interview enhancement flow and is safe since the mock handles multiple calls.

- [ ] **Step 6: Verify imports and syntax**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && python3 -m py_compile app/main.py app/api/v1/routers/challenges.py app/api/v1/routers/interviews.py app/services/interview_service.py && echo OK"
```

Expected: `OK`

- [ ] **Step 7: Run full unit suite — all 8 tests in test_challenge_service.py should now pass**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/ -v 2>&1 | tail -15"
```

Expected: all 8 tests in `test_challenge_service.py` pass (including `test_generate_coding_question_links_challenge`), and all prior tests still pass.

- [ ] **Step 8: Create `backend/tests/integration/test_challenges.py`**

```python
"""Integration tests for /api/v1/challenges. AI calls mocked via conftest dependency_overrides."""
from __future__ import annotations

import pytest

_USER = {"email": "challenge_user@example.com", "username": "challengeuser", "password": "securepassword123"}


async def _login(client) -> str:
    await client.post("/api/v1/auth/register", json=_USER)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": _USER["email"], "password": _USER["password"]},
    )
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_challenges_returns_200(client):
    token = await _login(client)
    resp = await client.get("/api/v1/challenges", headers=_auth(token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_generate_challenge_returns_201(client):
    token = await _login(client)
    resp = await client.post(
        "/api/v1/challenges/generate",
        json={"difficulty": "junior", "category": "arrays"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert "title" in body
    assert "starter_code" in body
    assert body["source"] == "ai_generated"
    assert body["difficulty"] == "junior"


@pytest.mark.asyncio
async def test_get_challenge_by_id(client):
    token = await _login(client)
    gen = await client.post(
        "/api/v1/challenges/generate",
        json={"difficulty": "mid"},
        headers=_auth(token),
    )
    challenge_id = gen.json()["id"]
    resp = await client.get(f"/api/v1/challenges/{challenge_id}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == challenge_id


@pytest.mark.asyncio
async def test_submit_attempt_returns_201(client):
    token = await _login(client)
    gen = await client.post(
        "/api/v1/challenges/generate",
        json={"difficulty": "junior"},
        headers=_auth(token),
    )
    challenge_id = gen.json()["id"]
    resp = await client.post(
        f"/api/v1/challenges/{challenge_id}/attempts",
        json={"language": "python", "code": "def two_sum(nums, target):\n    return [0, 1]"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert body["challenge_id"] == challenge_id
    assert body["language"] == "python"
    assert "time_complexity" in body
    assert "space_complexity" in body
    assert "feedback_text" in body
    assert "overall_score" in body


@pytest.mark.asyncio
async def test_list_my_attempts_returns_200(client):
    token = await _login(client)
    gen = await client.post(
        "/api/v1/challenges/generate",
        json={"difficulty": "mid"},
        headers=_auth(token),
    )
    challenge_id = gen.json()["id"]
    await client.post(
        f"/api/v1/challenges/{challenge_id}/attempts",
        json={"language": "javascript", "code": "function twoSum(nums, target) { return [0,1]; }"},
        headers=_auth(token),
    )
    resp = await client.get(f"/api/v1/challenges/{challenge_id}/attempts/me", headers=_auth(token))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]["language"] == "javascript"


@pytest.mark.asyncio
async def test_get_question_challenge_via_interview(client):
    """End-to-end: generate_question (coding type) → fetch linked challenge."""
    token = await _login(client)
    create = await client.post(
        "/api/v1/interviews/sessions",
        json={"interview_type": "swe", "difficulty": "mid"},
        headers=_auth(token),
    )
    session_id = create.json()["id"]
    q = await client.post(
        f"/api/v1/interviews/sessions/{session_id}/questions",
        headers=_auth(token),
    )
    question_id = q.json()["id"]
    resp = await client.get(
        f"/api/v1/interviews/sessions/{session_id}/questions/{question_id}/challenge",
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "id" in body
    assert "title" in body
    assert "starter_code" in body


@pytest.mark.asyncio
async def test_challenges_require_auth(client):
    resp = await client.get("/api/v1/challenges")
    assert resp.status_code == 403
```

- [ ] **Step 9: Run full unit suite — all tests pass**

```
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/ -v 2>&1 | tail -15"
```

Expected: all unit tests pass (80+ total).

- [ ] **Step 10: Commit**

```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/api/v1/routers/challenges.py backend/app/api/v1/routers/interviews.py backend/app/services/interview_service.py backend/app/main.py backend/tests/conftest.py backend/tests/integration/test_challenges.py
git commit -m "feat: challenges router, interview enhancement, app wiring, and integration tests"
```

---

## Verification

```bash
# Unit tests (no Docker required)
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/unit/ -v"

# Syntax check all new/modified files
wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && python3 -m py_compile app/models/challenge.py app/core/enums.py app/ai/prompts/coding.py app/ai/parsers.py app/schemas/challenge.py app/repositories/challenge_repository.py app/services/challenge_service.py app/services/interview_service.py app/api/v1/routers/challenges.py app/api/v1/routers/interviews.py app/main.py && echo ALL_OK"

# Integration tests (requires Docker + postgres running)
# Start Docker first: docker compose -f docker/docker-compose.yml up -d postgres redis
# Then: wsl -e bash -c "cd /home/olari/ai-interview-simulator/backend && /home/olari/.local/bin/pytest tests/integration/ -v"
```

## Expected Endpoint Shape Reference

```
GET  /api/v1/challenges                          → list[ChallengeResponse]
GET  /api/v1/challenges/{id}                     → ChallengeResponse
POST /api/v1/challenges/generate                 → ChallengeResponse (201)
POST /api/v1/challenges/{id}/attempts            → AttemptResponse (201)
GET  /api/v1/challenges/{id}/attempts/me         → list[AttemptResponse]
GET  /api/v1/interviews/sessions/{s}/questions/{q}/challenge → ChallengeResponse
```

**ChallengeResponse fields:** `id`, `title`, `description`, `difficulty`, `category`, `source`, `starter_code` (dict), `test_cases` (list), `constraints`, `created_at`

**AttemptResponse fields:** `id`, `challenge_id`, `language`, `is_correct`, `time_complexity`, `space_complexity`, `feedback_text`, `overall_score`, `created_at`
