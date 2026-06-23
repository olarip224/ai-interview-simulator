#!/usr/bin/env python
"""Populate the DB with starter coding challenges. Run from backend/: python seed_challenges.py"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select

from app.database.session import _AsyncSessionLocal
from app.models.coding import CodingChallenge

CHALLENGES = [
    {
        "title": "Two Sum",
        "difficulty": "easy",
        "description": (
            "Given an array of integers nums and an integer target, return indices of the "
            "two numbers such that they add up to target.\n\n"
            "You may assume that each input has exactly one solution, "
            "and you may not use the same element twice."
        ),
        "tags": ["arrays", "hash-map"],
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]",
             "explanation": "nums[0] + nums[1] == 9"},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]"},
        ],
        "constraints": [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "Only one valid answer exists.",
        ],
        "starter_code": {
            "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    pass",
            "javascript": "function twoSum(nums, target) {\n    \n}",
        },
        "expected_approach": (
            "Use a hash map to store complement (target - num) as you iterate. "
            "O(n) time, O(n) space."
        ),
    },
    {
        "title": "Valid Parentheses",
        "difficulty": "easy",
        "description": (
            "Given a string s containing only '(', ')', '{', '}', '[' and ']', "
            "determine if the input string is valid.\n\n"
            "An input is valid if: open brackets are closed by the same type, "
            "in the correct order, and every close bracket has a corresponding open bracket."
        ),
        "tags": ["stacks", "strings"],
        "examples": [
            {"input": 's = "()"', "output": "true"},
            {"input": 's = "()[]{}"', "output": "true"},
            {"input": 's = "(]"', "output": "false"},
        ],
        "constraints": [
            "1 <= s.length <= 10^4",
            "s consists of parentheses only '()[]{}'",
        ],
        "starter_code": {
            "python": "def is_valid(s: str) -> bool:\n    pass",
            "javascript": "function isValid(s) {\n    \n}",
        },
        "expected_approach": (
            "Use a stack. Push open brackets; on close bracket pop and check match. "
            "Return True if stack empty at end. O(n) time, O(n) space."
        ),
    },
    {
        "title": "Maximum Subarray",
        "difficulty": "medium",
        "description": (
            "Given an integer array nums, find the subarray with the largest sum "
            "and return its sum.\n\n"
            "A subarray is a contiguous non-empty sequence of elements within an array."
        ),
        "tags": ["arrays", "dynamic-programming"],
        "examples": [
            {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6",
             "explanation": "Subarray [4,-1,2,1] has the largest sum 6."},
            {"input": "nums = [5,4,-1,7,8]", "output": "23"},
        ],
        "constraints": [
            "1 <= nums.length <= 10^5",
            "-10^4 <= nums[i] <= 10^4",
        ],
        "starter_code": {
            "python": "def max_subarray(nums: list[int]) -> int:\n    pass",
            "javascript": "function maxSubArray(nums) {\n    \n}",
        },
        "expected_approach": (
            "Kadane's algorithm: current_sum = max(num, current_sum + num); "
            "track max_sum. O(n) time, O(1) space."
        ),
    },
    {
        "title": "Binary Search",
        "difficulty": "easy",
        "description": (
            "Given a sorted array of integers nums and an integer target, "
            "return the index of target if it exists, or -1 if it does not.\n\n"
            "You must write an algorithm with O(log n) runtime complexity."
        ),
        "tags": ["arrays", "binary-search"],
        "examples": [
            {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4"},
            {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1"},
        ],
        "constraints": [
            "1 <= nums.length <= 10^4",
            "nums is sorted in ascending order.",
            "All integers in nums are unique.",
        ],
        "starter_code": {
            "python": "def search(nums: list[int], target: int) -> int:\n    pass",
            "javascript": "function search(nums, target) {\n    \n}",
        },
        "expected_approach": (
            "Classic binary search with left/right pointers; "
            "mid = (left+right)//2. O(log n) time, O(1) space."
        ),
    },
    {
        "title": "Climbing Stairs",
        "difficulty": "easy",
        "description": (
            "You are climbing a staircase. It takes n steps to reach the top.\n\n"
            "Each time you can either climb 1 or 2 steps. "
            "In how many distinct ways can you climb to the top?"
        ),
        "tags": ["dynamic-programming", "math", "memoization"],
        "examples": [
            {"input": "n = 2", "output": "2",
             "explanation": "Two ways: 1+1 steps, or 2 steps."},
            {"input": "n = 3", "output": "3",
             "explanation": "Three ways: 1+1+1, 1+2, 2+1."},
        ],
        "constraints": ["1 <= n <= 45"],
        "starter_code": {
            "python": "def climb_stairs(n: int) -> int:\n    pass",
            "javascript": "function climbStairs(n) {\n    \n}",
        },
        "expected_approach": (
            "This is Fibonacci. dp[i] = dp[i-1] + dp[i-2]. "
            "O(n) time, O(1) space using two variables."
        ),
    },
]


async def main() -> None:
    async with _AsyncSessionLocal() as session:
        seeded = 0
        for data in CHALLENGES:
            existing = (
                await session.execute(
                    select(CodingChallenge).where(CodingChallenge.title == data["title"])
                )
            ).scalar_one_or_none()
            if existing is None:
                session.add(CodingChallenge(**data))
                print(f"  + Seeding: {data['title']}")
                seeded += 1
            else:
                print(f"  ~ Skipping (exists): {data['title']}")
        await session.commit()
    print(f"Done. {seeded} challenge(s) added.")


if __name__ == "__main__":
    asyncio.run(main())
