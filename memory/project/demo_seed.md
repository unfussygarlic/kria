---
name: Demo Seed Data
description: Priya Mehta demo host account — 15 Indian gigs seeded for public screenshots
type: project
---

A realistic demo dataset was inserted into the local Supabase DB for showcasing the Grid dashboard.

**Why:** For public screenshots / investor demos showing a "lit" analytics page and realistic gig data.

**How to apply:** When working with the demo account or adding more seed data, preserve the UUIDs and data relationships below.

## Demo Host Account

| Field | Value |
|-------|-------|
| Name | Priya Mehta |
| Phone | 9988776655 |
| Grid login | `9988776655` + OTP `123456` |
| Auth ID | `ef4d67d4-a784-40fc-b94a-7c846ec1ddb2` |
| Auth email | `919988776655@kriya.dev` |
| City | Bangalore |
| Bio | Event production lead at Nexus Events |
| poster_reputation | 4.7 |
| total_gigs_posted | 15 |
| id_verified | true |

## Gig Overview (15 gigs)

| UUID suffix | Title | City | Status | Slots |
|-------------|-------|------|--------|-------|
| …0001 | Diwali Brand Activation – Fevicol | Mumbai | completed | 10/10 |
| …0002 | Amazon Great Indian Festival – Sampling | Delhi | completed | 8/8 |
| …0003 | NYE Concert 2025 – Crowd Management | Bangalore | completed | 5/6 (1 no-show) |
| …0004 | Hyderabad Startup Conclave – Registration | Hyderabad | completed | 7/8 (1 no-show) |
| …0005 | Republic Day Corporate Shoot – Photography | Delhi | completed | 3/3 |
| …0006 | Valentine's Day Campaign – Street Activation | Bangalore | completed | 10/12 |
| …0007 | Swiggy Instamart – Dark Store Launch | Mumbai | completed | 6/6 |
| …0008 | Women's Day Brand Activation – Tanishq | Chennai | completed | 5/5 |
| …0009 | NASSCOM Product Conclave – Booth Staff | Bangalore | completed | 9/10 (1 no-show) |
| …0010 | IPL Fan Zone – MI vs RCB | Mumbai | completed | 13/15 (2 no-shows) |
| …0011 | Bengaluru Tech Summit 2026 – Registration | Bangalore | in_progress | 8/8 |
| …0012 | Myntra EOSS – Promo Runners | Bangalore | in_progress | 7/10 |
| …0013 | Goa Sunburn Music Festival – Crowd Safety | Goa | open | 14/20 |
| …0014 | Flipkart Big Shopping Days – Lead Gen | Hyderabad | open | 3/8 |
| …0015 | Chennai Auto Expo 2026 – Tech Support | Chennai | open | 0/5 |

Gig UUIDs: `cccccccc-0000-0000-0000-00000000000{1-9}` and `cccccccc-0000-0000-0000-00000000001{0-5}`

## 15 Runner Profiles

UUIDs: `aaaaaaaa-0000-0000-0000-00000000000{1-15}`
Phones: `9876543201` through `9876543215`

| # | Name | City |
|---|------|------|
| r01 | Arjun Sharma | Delhi |
| r02 | Priyanka Nair | Bangalore |
| r03 | Rahul Gupta | Mumbai |
| r04 | Ananya Krishnan | Chennai |
| r05 | Karan Singh | Hyderabad |
| r06 | Divya Patel | Ahmedabad |
| r07 | Siddharth Rao | Bangalore |
| r08 | Meera Iyer | Chennai |
| r09 | Vikram Malhotra | Delhi |
| r10 | Shreya Joshi | Pune |
| r11 | Aditya Kumar | Hyderabad |
| r12 | Pooja Reddy | Hyderabad |
| r13 | Nikhil Shah | Mumbai |
| r14 | Kavya Menon | Kochi |
| r15 | Rohit Bose | Kolkata |

## Analytics Snapshot

- 144 applications (113 accepted, 20 rejected, 11 pending)
- 113 assignments: 76 completed, 8 checked-in, 24 assigned, 5 no-shows
- Fill rate: ~80% | No-show rate: ~4.4%
- Monthly ramp Nov→Apr: 1, 2, 2, 2, 2, 3 gigs
- Cities: Bangalore(5), Mumbai(3), Delhi(2), Hyderabad(2), Chennai(2), Goa(1)

## Seed Script

Saved at `/tmp/kriya_seed.sql` (ephemeral). Re-run against `kriya_supabase-db_1` if DB is wiped:
```bash
docker cp /tmp/kriya_seed.sql kriya_supabase-db_1:/tmp/kriya_seed.sql
docker exec kriya_supabase-db_1 psql -U postgres -f /tmp/kriya_seed.sql
```
Note: The script uses `ON CONFLICT DO NOTHING / DO UPDATE` so it's safe to re-run.
