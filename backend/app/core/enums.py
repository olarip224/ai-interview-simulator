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
