# Product Definition

## Purpose

This document defines the target product scope for the first version (MVP) of the AUP Student Productivity App.

The goal of the MVP is to build the smallest useful version of a student productivity app that helps AUP students:

1. Start focused study sessions
2. Stay off distracting apps while studying
3. Earn tokens for completed study time
4. Exchange tokens for rewards
5. Stay motivated through friends, streaks, and a leaderboard

This document is intentionally focused on the first version of the product so that the project stays simple, clear, and testable.

## Problem

Studying is often hard to start, hard to stay focused on, and easy to abandon. A short survey of 10 AUP students found that:

* 4/10 said getting started was their biggest difficulty
* 3/10 said staying focused was their biggest difficulty
* Only 1/10 currently used a productivity/study app
* 7/10 preferred Amex gift cards as a reward

Students also asked for a Pomodoro-style timer, help staying off their phone, rewards for studying, and a way to track work.

These results support combining a study timer, distraction control, rewards, and social motivation.

## Version 0 / MVP Scope

The first version should allow an AUP student to:

1. Create an account and log in
2. Start a study timer
3. Reduce access to distracting apps while the timer is running
4. Complete a study session
5. Receive tokens for completed study time
6. See their token balance
7. Exchange tokens for available rewards
8. Add other AUP students as friends
9. Build study streaks
10. Compare study activity through a leaderboard
11. View previous study sessions and basic study statistics

The main goal of the MVP is to test whether focus sessions + rewards + social motivation helps students study more consistently.

## Target User

The target users are AUP students.

For the first version, users should preferably register with an AUP email so the app stays focused on the AUP community.

The app should be simple enough that a student can start a study session without needing to learn how the app works first.

## Main Data

The first version of the product will need these main objects:

| Object | Description |
| --- | --- |
| User | Student account information |
| Study Session | Study start time, end time, duration, and completion status |
| Token Transaction | Record of tokens earned or spent |
| Reward | Available rewards and their token prices |
| Redemption | Record of rewards purchased by users |
| Friendship | Friend relationships and friend requests |
| Streak | Current consecutive study days |

Leaderboard information can mainly be calculated from study-session data rather than stored separately.

### User Fields

| Field | Description |
| --- | --- |
| name | Student's display name |
| aup_email | AUP email used for account creation |
| username | Public username |
| token_balance | Current number of tokens |
| current_streak | Current study streak |
| total_study_time | Total completed study time |

## Features and Acceptance Criteria

### User Account

Students should be able to create an account and log in.

Acceptance criteria:

* A student can create an account with basic information.
* A student can log in with their account credentials.
* The account stores name, AUP email, username, token balance, streak, and total study time.

### Study Timer

Students should be able to run a study session with a timer.

Acceptance criteria:

* A student can select a study duration.
* A student can start a session and see the remaining time.
* A student can end or cancel a session.
* A student can successfully complete a session.
* A Pomodoro-style timer may also be offered.

### Distraction Blocking

While a study session is active, the app should restrict access to selected distracting apps where the device allows it.

Acceptance criteria:

* During an active session, selected distracting apps are restricted as much as iOS/Android permissions allow.
* Blocking is used to reduce the temptation to open social media or other distracting apps.
* The exact level of blocking may depend on operating-system limits.

### Token System

Students should earn tokens after successfully completing study sessions.

Acceptance criteria:

* Tokens are calculated based on completed study time.
* Earned tokens are added to the user's account.
* Token transactions are recorded.
* Cancelled sessions do not award tokens.
* The exact token-to-study-time ratio can be decided during later development.

### Rewards

Students should be able to view rewards and exchange tokens for them.

Acceptance criteria:

* A student can view a list of available rewards and token prices.
* A student can exchange tokens for a reward if they have enough tokens.
* Potential rewards include Amex gift cards, Uber Eats gift cards, AUP merchandise, and local coffee shop rewards.
* For the college prototype, redemption may be simulated instead of automatically purchasing real gift cards.

### Friends

Students should be able to connect with other AUP students.

Acceptance criteria:

* A student can search for other users.
* A student can send, accept, or reject friend requests.
* A student can view their friends list.
* Only basic social functionality is required for the MVP.

### Study Streaks

The app should track consecutive days of completed study time.

Acceptance criteria:

* A student can see their current streak.
* Completing the required study amount on consecutive days increases the streak.
* Missing a day may reset the streak.

### Leaderboard

Students should be able to compare study activity with others.

Acceptance criteria:

* A leaderboard shows study activity between users or friends.
* Possible rankings include total study time this week, completed sessions, or current streak.
* The leaderboard is mainly a motivational feature.

### Study History

Students should be able to review past study sessions.

Acceptance criteria:

* A student can view previous study sessions.
* Each session shows date, duration, tokens earned, and whether it was completed.
* Basic weekly study statistics may also be shown.

### Reward Redemption History

The system should keep a record when tokens are exchanged for a reward.

Acceptance criteria:

* Each redemption stores the user, reward, token cost, date, and status.

## User Stories

* **US-01:** As an AUP student, I want to start a study timer so that I can focus for a specific amount of time.
* **US-02:** As a student, I want distracting applications to be restricted during my study session so that I am less likely to use my phone.
* **US-03:** As a student, I want to earn tokens when I study so that I have an extra reason to complete my sessions.
* **US-04:** As a student, I want to exchange my tokens for rewards so that the time I spend studying has an additional incentive.
* **US-05:** As a student, I want to add my friends so that we can motivate each other.
* **US-06:** As a student, I want to see a leaderboard so that I can compare my study activity with my friends.
* **US-07:** As a student, I want to maintain a study streak so that I am encouraged to study consistently.

## MVP Priorities

Highest-priority features for the first working version:

1. User registration and login
2. Study timer
3. Distraction blocking
4. Study-session tracking
5. Token system
6. Reward catalogue
7. Basic friends system
8. Streaks
9. Leaderboard

## Out of Scope for Version 0

The following features are not required for the first version:

* Automatic purchasing of real Amex/Uber Eats gift cards
* Complex reward partnerships
* Full assignment verification or moderation
* Messaging between friends
* Large public social feeds
* Detailed calendar or agenda functionality
* Advanced productivity analytics
* Full Blackboard receipt / proof-of-work verification

These features may be considered later after the basic concept has been tested.

For the MVP, normal study sessions can mainly operate on trust. More advanced verification can be added later.

## Success Criteria

Version 0 is successful when an AUP student can:

* create an account and log in
* start and complete a study session
* earn tokens for completed study time
* view and redeem rewards
* add friends and see streaks/leaderboard motivation features

The project documentation is successful when another teammate can read this file and clearly understand what the MVP includes and what is intentionally excluded.
