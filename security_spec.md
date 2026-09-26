# Firestore Security Specification - SM SPORTS

 This document outlines the security invariants and test payloads for the SM SPORTS application.

 ## Data Invariants
 1. **Auction Integrity**: Only Admins and Super Admins can create or modify auction settings.
 2. **Bidding Authorization**: Only Team Owners can place bids, and only for the current active auction.
 3. **Purse Validation**: Bids cannot exceed the team's available budget (unless `unlimitedPurse` is enabled).
 4. **Identity Binding**: Players and Teams must belong to a specific Auction ID.
 5. **Immutable History**: Once a player is SOLD, the transaction details (soldTo, soldPrice) should be locked unless corrected by an Admin.
 6. **Registration Privacy**: Registered player data (including phone/email) should only be accessible to Admins or the registered user.

 ## The Dirty Dozen (Attack Payloads)
 1. **Identity Spoof**: An unauthenticated user attempts to create an auction.
 2. **Price Injection**: A Team Owner attempts to manually set a player's `soldPrice` without an actual bid transaction.
 3. **Budget Bypass**: A Team Owner places a bid higher than their remaining budget.
 4. **Shadow Update**: A user attempts to change their role from VIEW to ADMIN in their `users/{uid}` document.
 5. **Orphaned Player**: A user attempts to create a player document directly under `/auctions/{id}/players` without a valid auction parent.
 6. **PII Leak**: A viewer attempts to read the `registrations` collection to scrape phone numbers.
 7. **State Skip**: A Team Owner attempts to set an auction status to `FINISHED`.
 8. **Resource Poisoning**: An attacker attempts to inject a 2MB string into the auction `title` field.
 9. **Duplicate Registration**: A user attempts to overwrite another user's registration by guessing the `regId`.
 10. **Admin Impersonation**: A user attempts to write to `appConfig/globalSettings` by spoofing the Super Admin email in a client-side claim (which should be blocked by rules).
 11. **Auction Stealing**: An Admin of Auction A tries to modify Auction B settings. (Note: Currently roles are global, but we should restrict by ownership if possible).
 12. **Ghost Bid**: A bid is placed with a negative amount.

 ## Rules Implementation Strategy
 - Use `isValidAuction()`, `isValidBid()`, `isTeamOwner()` helpers.
 - Enforce `request.auth.token.email_verified == true`.
 - Use `exists()` to verify relational documents.
 - Block updates to immutable fields like `createdAt`.
