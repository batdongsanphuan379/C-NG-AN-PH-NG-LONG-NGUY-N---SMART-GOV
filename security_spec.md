# Security Specification: QR GovConnect

## Data Invariants
1. A citizen cannot book an appointment without a valid phone number and full name.
2. An appointment cannot exceed the slot capacity.
3. Only officers (Admins) can update the status of an appointment.
4. Citizens can only 'read' their own appointment if they have the `recordCode` (or we use Auth for them, but usually they just track via code).
5. All IDs must be strictly validated.

## The Dirty Dozen Payloads (Red Team Tests)
1. **Identity Spoofing**: Attempt to create an appointment with status "confirmed".
2. **Resource Poisoning**: Create an appointment with a 1MB `citizenName`.
3. **Privilege Escalation**: Attempt to delete another person's appointment.
4. **ID Poisoning**: Query `/appointments/../bad-path`.
5. **State Shortcutting**: Change status from "pending" to "completed" directly as a citizen.
6. **Self-Promotion**: Writing to `/admins/{uid}` to make oneself an officer.
7. **Phantom Booking**: Booking a date in the past.
8. **Shadow Field**: Adding `isVerified: true` to an appointment creation.
9. **DDoS Storage**: Sending an array of 10,000 tags in the metadata.
10. **PII Leak**: Querying `/appointments` without filtering by `recordCode` or being an Admin.
11. **Timestamp Spoofing**: Sending a manual `createdAt` string.
12. **Relationship Orphan**: Booking an appointment for a `procedureId` that doesn't exist.

## Test Runner (Draft)
A `firestore.rules.test.ts` will verify these. (Skipping detailed TS test for now, focusing on rules construction).
