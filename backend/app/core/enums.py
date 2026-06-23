from enum import StrEnum


class InterviewType(StrEnum):
    SWE = "swe"
    ML = "ml"
    BEHAVIORAL = "behavioral"
    CYBERSECURITY = "cybersecurity"


class Difficulty(StrEnum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"


class SessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class QuestionType(StrEnum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    CODING = "coding"
    FOLLOW_UP = "follow_up"


class ChallengeDifficulty(StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
