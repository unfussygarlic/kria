#!/usr/bin/env python3
"""
Kriya Dev Seed Script
---------------------
Populates the local Supabase database with dummy profiles, events, and gigs.

Usage (from project root):
    python3 scripts/seed_dev.py           # create seed data
    python3 scripts/seed_dev.py --clean   # delete seed users first, then recreate

Requirements: Supabase local running at http://localhost:54321
No extra dependencies — uses Python standard library only.

Generates approximately 215+ gigs: 12 events (~75), ~23 standalone, ~120 generated combos.
"""

import json
import sys
import time
import urllib.error
import urllib.request

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = "http://localhost:54321"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
)
DEV_PASSWORD = "kriya-dev-2026"

SEED_PHONES = {
    "priya":  "9001000001",
    "vikram": "9001000002",
    "rahul":  "9001000003",
    "aisha":  "9001000004",
    "suresh": "9001000005",
}

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _req(method, path, data=None, params=None):
    url = SUPABASE_URL + path
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return (json.loads(raw) if raw else {}), r.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        return json.loads(raw) if raw else {}, e.code


def _insert(table, data):
    result, status = _req("POST", f"/rest/v1/{table}", data)
    if status not in (200, 201):
        raise RuntimeError(f"Insert {table} failed [{status}]: {result}")
    rows = result if isinstance(result, list) else [result]
    if not rows or "id" not in rows[0]:
        raise RuntimeError(f"Insert {table} returned no id: {result}")
    return rows[0]["id"]


def _patch(table, filter_param, data):
    _, status = _req("PATCH", f"/rest/v1/{table}", data, params={"id": filter_param})
    if status not in (200, 201, 204):
        raise RuntimeError(f"Patch {table} failed [{status}]")


def _get_all_auth_users():
    users = []
    page = 1
    while True:
        data, _ = _req("GET", "/auth/v1/admin/users", params={"page": str(page), "per_page": "50"})
        batch = data.get("users", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        users.extend(batch)
        if len(batch) < 50:
            break
        page += 1
    return users


def _find_user_by_email(email):
    for u in _get_all_auth_users():
        if u.get("email") == email:
            return u["id"]
    return None


def create_auth_user(phone, display_name):
    email = f"{phone}@kriya.dev"
    result, status = _req("POST", "/auth/v1/admin/users", {
        "email": email,
        "password": DEV_PASSWORD,
        "email_confirm": True,
        "user_metadata": {"display_name": display_name, "phone": phone},
    })
    if status in (200, 201) and isinstance(result, dict) and "id" in result:
        return result["id"], True
    uid = _find_user_by_email(email)
    if uid:
        return uid, False
    raise RuntimeError(f"Could not create or find user {email}: [{status}] {result}")


def delete_auth_user(user_id):
    _req("DELETE", f"/auth/v1/admin/users/{user_id}")


# ── Gig data ──────────────────────────────────────────────────────────────────
# Each event dict has a "gigs" list of partial gig dicts that inherit the
# event's poster_id, event_id, venue_name, city, event_date, etc.

def build_events(uids):
    """Return a list of event defs, each with embedded gig templates."""
    P = uids["priya"]
    V = uids["vikram"]

    return [
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "Grand Wedding Reception — The Oberoi",
            "description": "High-profile 3-day wedding at The Oberoi. Professional, well-presented team for all guest-facing roles. Smart dress code enforced. Dinner provided each day.",
            "venue_name": "The Oberoi Bangalore",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-03-07", "event_end_date": "2026-03-09", "is_multi_day": True,
            "gigs": [
                {"title": "Guest Reception & Seating", "category": "ushering",
                 "description": "Welcome guests, verify against guest list, guide to allocated tables.",
                 "shift_start_time": "17:00:00", "shift_end_time": "23:30:00", "report_time": "16:30:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 8, "slots_filled": 2,
                 "gender_preference": "any", "dress_code": "Black blazer + white shirt (provided)",
                 "languages_required": ["english", "hindi"]},
                {"title": "Food & Beverage Service Staff", "category": "hospitality",
                 "description": "Serve food and beverages at tables and buffet stations. Prior hospitality experience preferred.",
                 "shift_start_time": "16:00:00", "shift_end_time": "23:30:00", "report_time": "15:30:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 12, "slots_filled": 3,
                 "dress_code": "White shirt + black trousers (provided)", "languages_required": ["english", "kannada"]},
                {"title": "Valet Parking Attendant", "category": "general_support",
                 "description": "Park and retrieve guest vehicles. Valid driving licence required.",
                 "shift_start_time": "16:00:00", "shift_end_time": "23:59:00", "report_time": "15:45:00",
                 "pay_amount": 1800, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
                 "gender_preference": "male", "dress_code": "Event uniform provided",
                 "requirements_note": "Valid 2W or 4W driving licence mandatory."},
                {"title": "Wedding Photographer (Candid)", "category": "photography",
                 "description": "Capture candid and portrait shots across all 3 days. DSLR/mirrorless mandatory. Gallery delivered within 48 hrs.",
                 "shift_start_time": "15:00:00", "shift_end_time": "23:59:00", "report_time": "14:30:00",
                 "pay_amount": 5000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "requirements_note": "Portfolio of wedding photography required.", "experience_required": True},
                {"title": "DJ Equipment Setup & Teardown", "category": "tech_support",
                 "description": "Assist the in-house AV team with PA system, DJ decks, and stage lighting. Evening shift only.",
                 "shift_start_time": "13:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 1000, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0},
                {"title": "Social Media Live Coverage", "category": "social_media",
                 "description": "Post live updates to the event's Instagram story and Reels. Reels must be delivered same evening.",
                 "shift_start_time": "17:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 2500, "pay_type": "per_day", "slots_total": 1, "slots_filled": 0,
                 "requirements_note": "Instagram handle + content portfolio required during application."},
                {"title": "Entrance Decor & Floral Arrangement Assistant", "category": "general_support",
                 "description": "Assist the florist team in setting up entrance archways and table centrepieces on Day 1.",
                 "shift_start_time": "09:00:00", "shift_end_time": "16:00:00",
                 "pay_amount": 800, "pay_type": "per_day", "slots_total": 5, "slots_filled": 1},
                {"title": "Gift & Favour Table Manager", "category": "registration_desk",
                 "description": "Manage the gifts table, log incoming items, coordinate with family members, hand out wedding favours.",
                 "shift_start_time": "17:00:00", "shift_end_time": "23:30:00",
                 "pay_amount": 1000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "languages_required": ["english", "hindi", "kannada"]},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "Nasscom Product Conclave 2026",
            "description": "India's premier tech conference — 2000+ attendees. Registration, session management, delegate guidance. BIEC, Tumkur Road.",
            "venue_name": "Bangalore International Exhibition Centre",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-02-22", "event_end_date": "2026-02-23", "is_multi_day": True,
            "gigs": [
                {"title": "Delegate Registration Desk", "category": "registration_desk",
                 "description": "Check in delegates, issue badges and conference kits. Must be calm under high-traffic periods.",
                 "shift_start_time": "08:00:00", "shift_end_time": "18:00:00", "report_time": "07:30:00",
                 "pay_amount": 1600, "pay_type": "per_day", "slots_total": 10, "slots_filled": 4,
                 "dress_code": "Business formal — navy/white", "languages_required": ["english"]},
                {"title": "Session Hall Ushering", "category": "ushering",
                 "description": "Guide delegates to session halls, manage seating overflow, assist speakers with AV.",
                 "shift_start_time": "09:00:00", "shift_end_time": "19:00:00", "report_time": "08:30:00",
                 "pay_amount": 1400, "pay_type": "per_day", "slots_total": 6, "slots_filled": 1,
                 "dress_code": "Smart casual (branded lanyard provided)", "languages_required": ["english"]},
                {"title": "Speaker Lounge Host", "category": "hospitality",
                 "description": "Manage speaker lounge access, coordinate AV tech checks, ensure speakers reach stages on time.",
                 "shift_start_time": "08:30:00", "shift_end_time": "18:30:00",
                 "pay_amount": 1800, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Conference Photographer", "category": "photography",
                 "description": "Stage, candid, and networking shots. 100+ edited photos delivered nightly.",
                 "shift_start_time": "09:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 3500, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "experience_required": True},
                {"title": "Live Social Media Crew", "category": "social_media",
                 "description": "Tweet live updates, post LinkedIn highlights, capture short speaker clips for LinkedIn video.",
                 "shift_start_time": "09:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 2000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0},
                {"title": "AV & Tech Support", "category": "tech_support",
                 "description": "Operate presentation clickers, troubleshoot microphones and projectors between sessions.",
                 "shift_start_time": "07:30:00", "shift_end_time": "20:00:00",
                 "pay_amount": 1800, "pay_type": "per_day", "slots_total": 4, "slots_filled": 2},
                {"title": "Exhibition Booth Coordinator", "category": "booth_staff",
                 "description": "Support 40+ exhibitors with logistics, booth materials, and visitor queries.",
                 "shift_start_time": "08:00:00", "shift_end_time": "18:30:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": V,
            "title": "Lollapalooza India 2026",
            "description": "India's biggest music festival returns to Mahalaxmi Racecourse, Mumbai. 3 days, 6 stages, 50,000+ daily attendees. High-energy staff only.",
            "venue_name": "Mahalaxmi Racecourse, Mumbai",
            "city": "Mumbai", "state": "Maharashtra",
            "event_date": "2026-03-27", "event_end_date": "2026-03-29", "is_multi_day": True,
            "gigs": [
                {"title": "Gate Entry & Wristband Check", "category": "registration_desk",
                 "description": "Scan tickets, issue wristbands, manage crowd flow at main gates. Must be comfortable in large crowds.",
                 "shift_start_time": "11:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 20, "slots_filled": 5,
                 "languages_required": ["english", "hindi"]},
                {"title": "Crowd Safety Marshal", "category": "general_support",
                 "description": "Monitor crowd density near stages, guide audience to safe zones, liaise with security.",
                 "shift_start_time": "12:00:00", "shift_end_time": "00:00:00",
                 "pay_amount": 1400, "pay_type": "per_day", "slots_total": 30, "slots_filled": 8,
                 "gender_preference": "any", "requirements_note": "Must be physically fit. Hi-vis vest and radio provided."},
                {"title": "Brand Activation Booth Staff", "category": "booth_staff",
                 "description": "Run interactive brand activations (Spotify, Bacardi, OnePlus booths). Engage attendees in games and demos.",
                 "shift_start_time": "12:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 15, "slots_filled": 3,
                 "languages_required": ["english", "hindi"]},
                {"title": "Merchandise Store Staff", "category": "general_support",
                 "description": "Sell official Lolla merchandise, handle cash and UPI, manage inventory replenishment.",
                 "shift_start_time": "12:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 1300, "pay_type": "per_day", "slots_total": 12, "slots_filled": 2},
                {"title": "Food Court Operations", "category": "hospitality",
                 "description": "Support food vendors with queue management, tray disposal stations, and cleanliness.",
                 "shift_start_time": "11:00:00", "shift_end_time": "23:30:00",
                 "pay_amount": 1100, "pay_type": "per_day", "slots_total": 20, "slots_filled": 6},
                {"title": "Artist Backstage Runner", "category": "general_support",
                 "description": "Deliver rider items, escort artists between green room and stage, coordinate with artist managers.",
                 "shift_start_time": "14:00:00", "shift_end_time": "02:00:00",
                 "pay_amount": 2000, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
                 "requirements_note": "Confidentiality and professionalism are non-negotiable."},
                {"title": "Festival Photographer (Roving)", "category": "photography",
                 "description": "Roving candid coverage of crowd, performances, and brand activations across all 3 days.",
                 "shift_start_time": "12:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 4000, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "experience_required": True, "requirements_note": "Portfolio of live music photography required."},
                {"title": "Social Media Content Creator", "category": "social_media",
                 "description": "Create 3-5 daily Instagram Reels, LinkedIn BTS posts, and Twitter/X live commentary.",
                 "shift_start_time": "12:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 3500, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0},
                {"title": "Lost & Found Helpdesk", "category": "registration_desk",
                 "description": "Operate the L&F counter, log and return items, coordinate with security for valuable finds.",
                 "shift_start_time": "12:00:00", "shift_end_time": "00:00:00",
                 "pay_amount": 1000, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
                 "languages_required": ["english", "hindi"]},
                {"title": "VIP Lounge Host", "category": "hospitality",
                 "description": "Manage access to VIP hospitality zone, attend to premium guests, coordinate with caterers.",
                 "shift_start_time": "13:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 2200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 1,
                 "gender_preference": "any", "dress_code": "All-black smart casual", "languages_required": ["english"]},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "TEDxBangalore 2026: Rethink Everything",
            "description": "One-day independently organized TED event at Christ University. 800 attendees, 20 speakers. Looking for passionate volunteers and paid crew.",
            "venue_name": "Christ University Auditorium, Hosur Road",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-04-05",
            "gigs": [
                {"title": "Event Check-In & Badge Distribution", "category": "registration_desk",
                 "description": "Scan QR code tickets, print on-demand badges, direct attendees to seating.",
                 "shift_start_time": "07:30:00", "shift_end_time": "13:00:00",
                 "pay_amount": 900, "pay_type": "fixed", "slots_total": 6, "slots_filled": 1,
                 "languages_required": ["english"]},
                {"title": "Stage & AV Crew", "category": "tech_support",
                 "description": "Manage microphones, clicker, confidence monitor and basic lighting cues.",
                 "shift_start_time": "07:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 1500, "pay_type": "fixed", "slots_total": 3, "slots_filled": 0},
                {"title": "Audience Engagement Coordinator", "category": "ushering",
                 "description": "Seat attendees, manage Q&A mic routing, coordinate audience activities.",
                 "shift_start_time": "08:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 1000, "pay_type": "fixed", "slots_total": 4, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Event Videographer", "category": "photography",
                 "description": "Record all talks in high quality. Multi-cam setup (2 cameras). Raw + colour-graded master file required within 72 hrs.",
                 "shift_start_time": "07:30:00", "shift_end_time": "19:00:00",
                 "pay_amount": 6000, "pay_type": "fixed", "slots_total": 1, "slots_filled": 0,
                 "experience_required": True},
                {"title": "Graphic Live-Art Illustrator", "category": "other",
                 "description": "Create live visual note-taking (sketchnoting) of each talk on a large canvas. Work displayed after event.",
                 "shift_start_time": "09:00:00", "shift_end_time": "17:00:00",
                 "pay_amount": 3000, "pay_type": "fixed", "slots_total": 1, "slots_filled": 0},
                {"title": "Speaker Hospitality Escort", "category": "hospitality",
                 "description": "Greet speakers, manage their schedule throughout the day, accompany to stage on time.",
                 "shift_start_time": "08:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 1200, "pay_type": "fixed", "slots_total": 3, "slots_filled": 0,
                 "languages_required": ["english"]},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": V,
            "title": "India Fashion Week — Spring/Summer 2026",
            "description": "India's biggest fashion showcase at NMACC, Mumbai. 5 days, 200+ designers, international press. Seeking professional runway and backstage support.",
            "venue_name": "Nita Mukesh Ambani Cultural Centre, BKC",
            "city": "Mumbai", "state": "Maharashtra",
            "event_date": "2026-04-14", "event_end_date": "2026-04-18", "is_multi_day": True,
            "gigs": [
                {"title": "Runway Ushering", "category": "ushering",
                 "description": "Seat media, buyers, and guests according to seating charts. Must be calm and presentable.",
                 "shift_start_time": "14:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 1600, "pay_type": "per_day", "slots_total": 10, "slots_filled": 0,
                 "dress_code": "All-black formal", "languages_required": ["english"]},
                {"title": "Backstage Dresser Assistant", "category": "general_support",
                 "description": "Assist senior dressers with quick changes, steaming garments, and organizing looks on rack.",
                 "shift_start_time": "10:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 1400, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
                 "gender_preference": "female", "requirements_note": "Must be comfortable in fast-paced environments."},
                {"title": "Press Registration Desk", "category": "registration_desk",
                 "description": "Accredit press and media, issue passes, manage the media list from 200+ outlets.",
                 "shift_start_time": "09:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 1800, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Fashion Show Photographer", "category": "photography",
                 "description": "Shoot runway looks from designated press pit. Edited selects uploaded within 2 hrs of each show.",
                 "shift_start_time": "14:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 6000, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "experience_required": True},
                {"title": "Designer Lounge Hospitality", "category": "hospitality",
                 "description": "Serve designer guests and VIPs in the exclusive lounge. Professional and discreet.",
                 "shift_start_time": "10:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 2000, "pay_type": "per_day", "slots_total": 6, "slots_filled": 1,
                 "dress_code": "All-black server uniform (provided)", "languages_required": ["english"]},
                {"title": "Brand Activation Promoter", "category": "brand_ambassador",
                 "description": "Represent sponsor brands (cosmetics, jewellery) at pop-up booths inside the venue.",
                 "shift_start_time": "11:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 8, "slots_filled": 2,
                 "gender_preference": "female", "languages_required": ["english", "hindi"]},
                {"title": "Social Media Stories & Reels Crew", "category": "social_media",
                 "description": "Behind-the-scenes Reels and Stories for the official IFW accounts. 4 Reels/day minimum.",
                 "shift_start_time": "12:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 3000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "Google Cloud Next India 2026",
            "description": "Google's flagship cloud conference at JW Marriott BLR. 1500 enterprise attendees. Tech-savvy support staff and hospitality crew.",
            "venue_name": "JW Marriott, Vittal Mallya Road",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-05-08", "event_end_date": "2026-05-09", "is_multi_day": True,
            "gigs": [
                {"title": "Delegate Check-In (Wave 1 & 2)", "category": "registration_desk",
                 "description": "Scan QR invites, issue RFID badge, explain app and venue map to delegates.",
                 "shift_start_time": "08:00:00", "shift_end_time": "12:00:00",
                 "pay_amount": 1400, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Demo Booth Presenter — Google Products", "category": "booth_staff",
                 "description": "Showcase Google Workspace and Cloud demos at interactive kiosks. Training provided Day 0.",
                 "shift_start_time": "09:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 2500, "pay_type": "per_day", "slots_total": 10, "slots_filled": 2,
                 "requirements_note": "Basic cloud/SaaS familiarity required."},
                {"title": "Networking Zone Facilitator", "category": "general_support",
                 "description": "Facilitate structured networking sessions, manage icebreakers, note attendee feedback.",
                 "shift_start_time": "10:00:00", "shift_end_time": "17:00:00",
                 "pay_amount": 1600, "pay_type": "per_day", "slots_total": 5, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Session MC / Host", "category": "anchoring",
                 "description": "Introduce speakers, manage Q&A sessions, keep energy levels high between sessions.",
                 "shift_start_time": "09:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 5000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "experience_required": True, "languages_required": ["english"]},
                {"title": "Coffee & Catering Station Manager", "category": "hospitality",
                 "description": "Manage catering stations, ensure continuous replenishment, assist catering partner.",
                 "shift_start_time": "07:30:00", "shift_end_time": "18:30:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0},
                {"title": "Photo Wall & Swag Distribution", "category": "promotional",
                 "description": "Operate the Googleplex photo wall booth, distribute branded swag to delegates.",
                 "shift_start_time": "09:00:00", "shift_end_time": "17:00:00",
                 "pay_amount": 1300, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": V,
            "title": "Comic Con India — Bangalore Edition 2026",
            "description": "India's biggest pop-culture event. 30,000+ attendees over 2 days at KTPO. Cosplay, gaming, comics, merch. Fun, chaotic, unforgettable.",
            "venue_name": "KTPO Convention Centre, Whitefield",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-05-23", "event_end_date": "2026-05-24", "is_multi_day": True,
            "gigs": [
                {"title": "Entry Gate Scanner", "category": "registration_desk",
                 "description": "Scan tickets, check pass types, manage separate queues for VIP, General, and Cosplay Contest entries.",
                 "shift_start_time": "09:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 1100, "pay_type": "per_day", "slots_total": 15, "slots_filled": 3},
                {"title": "Artist Alley Coordinator", "category": "booth_staff",
                 "description": "Help 200+ independent artist vendors with setup, queries, and locating their stalls.",
                 "shift_start_time": "07:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0},
                {"title": "Cosplay Contest Stage Manager", "category": "ushering",
                 "description": "Manage backstage lineup of cosplayers, coordinate with emcee, oversee stage crossings.",
                 "shift_start_time": "10:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0},
                {"title": "Roving Event Photographer", "category": "photography",
                 "description": "Capture cosplay portraits, crowd energy, and exhibitor booths. Edited gallery each evening.",
                 "shift_start_time": "09:30:00", "shift_end_time": "20:00:00",
                 "pay_amount": 3000, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "experience_required": True},
                {"title": "Social Media Engagement Host", "category": "social_media",
                 "description": "Run viral content challenges, post live Reels from floor, drive trending hashtags.",
                 "shift_start_time": "10:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 2500, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0},
                {"title": "Merch Store Cashier", "category": "general_support",
                 "description": "Handle POS (UPI + card + cash), manage inventory, maintain queue order.",
                 "shift_start_time": "09:30:00", "shift_end_time": "20:30:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 1},
                {"title": "Gaming Zone Attendant", "category": "tech_support",
                 "description": "Set up and reset PS5/Xbox gaming stations, manage queue, handle minor technical issues.",
                 "shift_start_time": "09:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 1300, "pay_type": "per_day", "slots_total": 5, "slots_filled": 0},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "Karnataka Food & Beverage Expo 2026",
            "description": "Three-day food festival at Palace Grounds celebrating Karnataka's culinary diversity. 100+ food stalls, live cooking demos, wine and craft beer corner.",
            "venue_name": "Palace Grounds, Jayamahal Road",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-06-06", "event_end_date": "2026-06-08", "is_multi_day": True,
            "gigs": [
                {"title": "Ticket Booth Operator", "category": "registration_desk",
                 "description": "Sell walk-in tickets, issue wristbands, handle UPI and cash transactions.",
                 "shift_start_time": "11:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 1000, "pay_type": "per_day", "slots_total": 8, "slots_filled": 2,
                 "languages_required": ["english", "kannada"]},
                {"title": "Food Stall Sampling Promoter", "category": "sampling",
                 "description": "Distribute tastings for sponsor stalls, explain ingredients and pairings, drive stall footfall.",
                 "shift_start_time": "12:00:00", "shift_end_time": "21:00:00",
                 "pay_amount": 900, "pay_type": "per_day", "slots_total": 12, "slots_filled": 4,
                 "languages_required": ["english", "kannada", "hindi"]},
                {"title": "Wine & Craft Beer Zone Host", "category": "hospitality",
                 "description": "Manage seating in the premium zone, serve beverages, explain tasting notes.",
                 "shift_start_time": "14:00:00", "shift_end_time": "22:00:00",
                 "pay_amount": 1400, "pay_type": "per_day", "slots_total": 6, "slots_filled": 1,
                 "requirements_note": "Must be 21+. Prior bar hospitality experience preferred."},
                {"title": "Cooking Demo Stage Coordinator", "category": "ushering",
                 "description": "Manage seating for live cooking shows, oversee Q&A mic, coordinate with chefs on timings.",
                 "shift_start_time": "11:00:00", "shift_end_time": "20:00:00",
                 "pay_amount": 1100, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "languages_required": ["english", "kannada"]},
                {"title": "Food Festival Photographer", "category": "photography",
                 "description": "Capture dish close-ups, chef portraits, and crowd atmosphere. 50+ edited selects daily.",
                 "shift_start_time": "12:00:00", "shift_end_time": "21:00:00",
                 "pay_amount": 2500, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "experience_required": True},
                {"title": "Brand Ambassador — Sponsor Zone", "category": "brand_ambassador",
                 "description": "Promote OML and MTR sponsor booths, run engagement contests, collect opt-in leads.",
                 "shift_start_time": "12:00:00", "shift_end_time": "21:00:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
                 "languages_required": ["english", "kannada"]},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": V,
            "title": "Delhi AI & Robotics Conclave 2026",
            "description": "Two-day AI summit at Pragati Maidan, New Delhi. 3000+ delegates, 80+ speakers, live robotics demos. India's fastest-growing tech conference.",
            "venue_name": "Pragati Maidan, New Delhi",
            "city": "Delhi", "state": "Delhi",
            "event_date": "2026-06-18", "event_end_date": "2026-06-19", "is_multi_day": True,
            "gigs": [
                {"title": "Delegate Registration & QR Scan", "category": "registration_desk",
                 "description": "Handle delegate check-in waves, troubleshoot QR code issues, issue badge + lanyard kit.",
                 "shift_start_time": "08:00:00", "shift_end_time": "17:00:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 12, "slots_filled": 0,
                 "languages_required": ["english", "hindi"]},
                {"title": "Robotics Demo Zone Guide", "category": "general_support",
                 "description": "Explain 15 live robotics exhibits to delegates. Briefing provided on Day 0.",
                 "shift_start_time": "09:30:00", "shift_end_time": "18:30:00",
                 "pay_amount": 2000, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
                 "requirements_note": "Science/engineering background preferred.", "languages_required": ["english"]},
                {"title": "Live Streaming Tech Operator", "category": "tech_support",
                 "description": "Operate OBS/vMix for simultaneous YouTube and LinkedIn live streams of all 4 stages.",
                 "shift_start_time": "07:30:00", "shift_end_time": "20:00:00",
                 "pay_amount": 3000, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "experience_required": True},
                {"title": "Conference Emcee", "category": "anchoring",
                 "description": "Host main stage sessions, introduce speakers, moderate panel Q&A, and manage time.",
                 "shift_start_time": "09:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 8000, "pay_type": "per_day", "slots_total": 1, "slots_filled": 0,
                 "experience_required": True, "languages_required": ["english"]},
                {"title": "Sponsor Booth Activations", "category": "booth_staff",
                 "description": "Staff TCS, NVIDIA, and Microsoft booths with demos and lead collection.",
                 "shift_start_time": "09:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 2000, "pay_type": "per_day", "slots_total": 10, "slots_filled": 0},
                {"title": "Media & Press Coordinator", "category": "general_support",
                 "description": "Escort press to speaker interviews, manage the press lounge, coordinate photo ops.",
                 "shift_start_time": "08:30:00", "shift_end_time": "19:30:00",
                 "pay_amount": 1800, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Evening Networking Dinner Host", "category": "hospitality",
                 "description": "Manage 400-cover dinner event, seat delegates, liaise with caterers.",
                 "shift_start_time": "18:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
                 "languages_required": ["english", "hindi"]},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "IPL 2026 Fan Park — RCB Home Matches",
            "description": "Official RCB fan park at Kanteerava Stadium during all 7 home matches. High-energy crowd management and brand activations.",
            "venue_name": "M Chinnaswamy Stadium, Bangalore",
            "city": "Bangalore", "state": "Karnataka",
            "event_date": "2026-04-20", "event_end_date": "2026-05-15", "is_multi_day": True,
            "gigs": [
                {"title": "Fan Zone Entry Scanner", "category": "registration_desk",
                 "description": "Scan fan park QR passes, distribute wristbands, manage entry flow in match-day rush.",
                 "shift_start_time": "14:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 1300, "pay_type": "per_day", "slots_total": 10, "slots_filled": 2},
                {"title": "IPL Brand Activation Host", "category": "brand_ambassador",
                 "description": "Run Swiggy, CRED, and DLF activations inside the fan zone. Lead games and contests.",
                 "shift_start_time": "15:00:00", "shift_end_time": "23:00:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
                 "languages_required": ["english", "kannada", "hindi"]},
                {"title": "Food Court Flow Manager", "category": "hospitality",
                 "description": "Manage queue discipline at food stalls inside the stadium. Keep crowd orderly and safe.",
                 "shift_start_time": "14:00:00", "shift_end_time": "23:30:00",
                 "pay_amount": 1100, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0},
                {"title": "Match-Day Social Media Creator", "category": "social_media",
                 "description": "Create live Reels from fan zone, crowd reactions, and post-match content for RCB social.",
                 "shift_start_time": "15:00:00", "shift_end_time": "23:30:00",
                 "pay_amount": 3000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": V,
            "title": "Hyderabad International Pet Expo 2026",
            "description": "India's largest pet expo at HICC, Hyderabad. 3 days, 500+ exhibitors, pet shows, adoption drives, grooming zones.",
            "venue_name": "Hyderabad International Convention Centre",
            "city": "Hyderabad", "state": "Telangana",
            "event_date": "2026-07-04", "event_end_date": "2026-07-06", "is_multi_day": True,
            "gigs": [
                {"title": "Entry & Ticket Verification", "category": "registration_desk",
                 "description": "Scan tickets, check pet entry permits, distribute pet-friendly visitor kits.",
                 "shift_start_time": "09:30:00", "shift_end_time": "19:30:00",
                 "pay_amount": 1000, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
                 "languages_required": ["english", "telugu"]},
                {"title": "Pet Parade Stage Coordinator", "category": "ushering",
                 "description": "Manage the pet parade stage, assist handlers with timing, coordinate with judges.",
                 "shift_start_time": "10:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
                 "requirements_note": "Must be comfortable around all types of animals."},
                {"title": "Pet Adoption Drive Coordinator", "category": "lead_generation",
                 "description": "Manage the NGO adoption zone, collect adoption interest forms, follow up with potential adopters.",
                 "shift_start_time": "10:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 1100, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0},
                {"title": "Pet Brand Sampling Promoter", "category": "sampling",
                 "description": "Distribute Royal Canin and Heads Up For Tails product samples, demo products to pet owners.",
                 "shift_start_time": "10:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 1000, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
                 "languages_required": ["english", "telugu", "hindi"]},
                {"title": "Pet Event Photographer", "category": "photography",
                 "description": "Adorable pet portraits + competition shots. 80 edited images minimum per day.",
                 "shift_start_time": "10:00:00", "shift_end_time": "19:00:00",
                 "pay_amount": 2800, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "experience_required": True},
            ],
        },
        # ──────────────────────────────────────────────────────────────────────
        {
            "poster_id": P,
            "title": "Startup India Rising — Chennai Summit 2026",
            "description": "Two-day startup ecosystem event at the ITC Grand Chola. 1200 founders, investors, and corporates. Pitch competitions, workshops, networking.",
            "venue_name": "ITC Grand Chola, Mount Road",
            "city": "Chennai", "state": "Tamil Nadu",
            "event_date": "2026-06-25", "event_end_date": "2026-06-26", "is_multi_day": True,
            "gigs": [
                {"title": "Registration & Badge Printing Desk", "category": "registration_desk",
                 "description": "Check in delegates, print on-demand name badges, distribute welcome kits.",
                 "shift_start_time": "08:00:00", "shift_end_time": "11:00:00",
                 "pay_amount": 1200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
                 "languages_required": ["english", "tamil"]},
                {"title": "Investor Meet Facilitator", "category": "general_support",
                 "description": "Coordinate back-to-back investor-founder speed meetings. Manage time slots and introductions.",
                 "shift_start_time": "10:00:00", "shift_end_time": "17:00:00",
                 "pay_amount": 2000, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Pitch Competition Stage Manager", "category": "ushering",
                 "description": "Manage startup pitch queue, hold cards, coordinate with judges and AV team.",
                 "shift_start_time": "09:00:00", "shift_end_time": "18:00:00",
                 "pay_amount": 1500, "pay_type": "per_day", "slots_total": 3, "slots_filled": 0,
                 "languages_required": ["english"]},
                {"title": "Workshop Room Coordinator", "category": "ushering",
                 "description": "Set up 8 parallel workshop rooms, manage attendance, coordinate with facilitators.",
                 "shift_start_time": "09:00:00", "shift_end_time": "17:00:00",
                 "pay_amount": 1300, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0},
                {"title": "Event Videographer", "category": "photography",
                 "description": "Shoot all keynotes and panel sessions for post-event YouTube. Raw + 3-min highlight reel.",
                 "shift_start_time": "08:30:00", "shift_end_time": "19:30:00",
                 "pay_amount": 5000, "pay_type": "per_day", "slots_total": 2, "slots_filled": 0,
                 "experience_required": True},
            ],
        },
    ]


def build_standalone_gigs(uids):
    """Return a list of standalone gigs (no event_id)."""
    P = uids["priya"]
    V = uids["vikram"]

    return [
        # ── Vikram's brand / marketing gigs ───────────────────────────────────
        {"poster_id": V, "title": "Brand Ambassador — Myntra EORS",
         "description": "Represent Myntra at Phoenix Marketcity during the End of Reason Sale. Engage shoppers, explain offers, drive app downloads.",
         "category": "brand_ambassador", "company_name": "Myntra",
         "venue_name": "Phoenix Marketcity, Whitefield", "city": "Bangalore",
         "event_date": "2026-02-20", "event_end_date": "2026-02-28", "is_multi_day": True,
         "shift_start_time": "11:00:00", "shift_end_time": "21:00:00",
         "pay_amount": 1200, "pay_type": "per_day", "slots_total": 6, "slots_filled": 1,
         "dress_code": "Myntra branded T-shirt (provided)", "languages_required": ["english", "kannada"]},

        {"poster_id": V, "title": "Social Media Content Creator — Lenskart",
         "description": "Shoot Reels and Stories for Lenskart's Instagram & YouTube at their Indiranagar flagship. Content rights transferred.",
         "category": "social_media", "company_name": "Lenskart",
         "venue_name": "Lenskart Flagship, Indiranagar", "city": "Bangalore",
         "event_date": "2026-02-25",
         "shift_start_time": "11:00:00", "shift_end_time": "15:00:00",
         "pay_amount": 3000, "pay_type": "fixed", "slots_total": 2, "slots_filled": 0,
         "requirements_note": "Must bring own phone (iPhone 13+ or equivalent)."},

        {"poster_id": V, "title": "Event Photographer — Canon Pop-Up Experience",
         "description": "Shoot candid and product photos at Canon's weekend pop-up at UB City. DSLR provided on-site.",
         "category": "photography", "company_name": "Canon India",
         "venue_name": "UB City Mall, Vittal Mallya Road", "city": "Bangalore",
         "event_date": "2026-03-01",
         "shift_start_time": "10:00:00", "shift_end_time": "20:00:00", "report_time": "09:30:00",
         "pay_amount": 4500, "pay_type": "fixed", "slots_total": 1, "slots_filled": 0,
         "experience_required": True},

        {"poster_id": V, "title": "Product Sampling & Lead Gen — Mamaearth",
         "description": "Distribute Mamaearth skincare samples at Koramangala Social. Collect opt-in leads via QR code.",
         "category": "sampling", "company_name": "Mamaearth",
         "venue_name": "Social, Koramangala", "city": "Bangalore",
         "event_date": "2026-02-21", "event_end_date": "2026-02-22", "is_multi_day": True,
         "shift_start_time": "12:00:00", "shift_end_time": "20:00:00",
         "pay_amount": 900, "pay_type": "per_day", "slots_total": 4, "slots_filled": 2,
         "gender_preference": "female", "languages_required": ["english", "kannada", "hindi"]},

        {"poster_id": V, "title": "Booth Staff — India Startup Summit",
         "description": "Demo the product to visitors, collect business cards, answer FAQs. Training session the evening before.",
         "category": "booth_staff", "company_name": "Kriya Technologies",
         "venue_name": "The Lalit Ashok, Kumara Krupa Road", "city": "Bangalore",
         "event_date": "2026-03-05",
         "shift_start_time": "09:00:00", "shift_end_time": "17:00:00", "report_time": "08:45:00",
         "pay_amount": 2000, "pay_type": "fixed", "slots_total": 3, "slots_filled": 0,
         "languages_required": ["english"]},

        {"poster_id": V, "title": "Lead Generation — Real Estate Expo, Mumbai",
         "description": "Approach walk-in visitors at Godrej Properties stall. Qualify leads, collect contact details, schedule site visits.",
         "category": "lead_generation", "company_name": "Godrej Properties",
         "venue_name": "Jio World Convention Centre, BKC", "city": "Mumbai",
         "event_date": "2026-03-14", "event_end_date": "2026-03-16", "is_multi_day": True,
         "shift_start_time": "10:00:00", "shift_end_time": "19:00:00",
         "pay_amount": 1600, "pay_type": "per_day", "slots_total": 5, "slots_filled": 0,
         "languages_required": ["english", "hindi"]},

        {"poster_id": V, "title": "Promotional Brand Ambassador — Boat Audio",
         "description": "Demonstrate boAt earphones and speakers at retail stores across Bangalore. 5 stores over 2 days.",
         "category": "promotional", "company_name": "boAt Lifestyle",
         "venue_name": "Croma, Indiranagar + 4 others", "city": "Bangalore",
         "event_date": "2026-03-22", "event_end_date": "2026-03-23", "is_multi_day": True,
         "shift_start_time": "11:00:00", "shift_end_time": "20:00:00",
         "pay_amount": 1300, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
         "languages_required": ["english", "kannada"]},

        {"poster_id": V, "title": "Social Media Manager — Ather Energy Launch",
         "description": "Cover the Ather 450X launch event in Hyderabad. 4 Reels, 10 Stories, 2 LinkedIn posts per day.",
         "category": "social_media", "company_name": "Ather Energy",
         "venue_name": "Hyderabad International Convention Centre", "city": "Hyderabad",
         "event_date": "2026-04-02",
         "shift_start_time": "09:00:00", "shift_end_time": "19:00:00",
         "pay_amount": 4000, "pay_type": "fixed", "slots_total": 2, "slots_filled": 0,
         "requirements_note": "2+ years of brand social media experience. EV/auto interest a plus."},

        {"poster_id": V, "title": "Anchor / Emcee — Annual Corporate Gala, Pune",
         "description": "Host the Persistent Systems annual awards dinner. Opening, awards presentation, and entertainment coordination.",
         "category": "anchoring", "company_name": "Persistent Systems",
         "venue_name": "Conrad Pune, Mangaldas Road", "city": "Pune",
         "event_date": "2026-03-28",
         "shift_start_time": "17:00:00", "shift_end_time": "23:00:00",
         "pay_amount": 10000, "pay_type": "fixed", "slots_total": 1, "slots_filled": 0,
         "experience_required": True, "languages_required": ["english"]},

        {"poster_id": V, "title": "Hospitality Staff — Taj Luxury Dinner Series",
         "description": "Premium private dining service for 40-cover chef's table experience at Taj Bangalore. Black-tie service standard.",
         "category": "hospitality", "company_name": "Taj Hotels",
         "venue_name": "The Taj West End, Bangalore", "city": "Bangalore",
         "event_date": "2026-04-10", "event_end_date": "2026-04-12", "is_multi_day": True,
         "shift_start_time": "17:00:00", "shift_end_time": "23:30:00",
         "pay_amount": 2000, "pay_type": "per_day", "slots_total": 4, "slots_filled": 0,
         "dress_code": "Black-tie (provided)", "languages_required": ["english"],
         "requirements_note": "Fine dining experience required."},

        # ── Priya's ops & events gigs ─────────────────────────────────────────
        {"poster_id": P, "title": "College Fest Ushering — BITS Pilani Goa",
         "description": "Manage student crowd at BITS Pilani's Quark fest. Stage ushering, performer escort, wristband check.",
         "category": "ushering",
         "venue_name": "BITS Pilani Goa Campus", "city": "Goa",
         "event_date": "2026-02-28", "event_end_date": "2026-03-02", "is_multi_day": True,
         "shift_start_time": "10:00:00", "shift_end_time": "22:00:00",
         "pay_amount": 1200, "pay_type": "per_day", "slots_total": 10, "slots_filled": 3,
         "languages_required": ["english", "hindi"]},

        {"poster_id": P, "title": "Registration Desk — IIM Ahmedabad Alumni Meet",
         "description": "Check in 600+ alumni, issue tags, manage room allocation sheets, escort to breakout sessions.",
         "category": "registration_desk", "company_name": "IIMA Alumni Association",
         "venue_name": "IIM Ahmedabad Campus", "city": "Ahmedabad",
         "event_date": "2026-04-18",
         "shift_start_time": "08:00:00", "shift_end_time": "18:00:00",
         "pay_amount": 1500, "pay_type": "fixed", "slots_total": 6, "slots_filled": 0,
         "languages_required": ["english"]},

        {"poster_id": P, "title": "General Support — Kolkata Film Festival",
         "description": "Venue management support for KIFF screenings. Queue management, seat allocation, press escort.",
         "category": "general_support",
         "venue_name": "Nandan Cinema Complex, Kolkata", "city": "Kolkata",
         "event_date": "2026-04-24", "event_end_date": "2026-04-30", "is_multi_day": True,
         "shift_start_time": "12:00:00", "shift_end_time": "22:00:00",
         "pay_amount": 1000, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
         "languages_required": ["english", "bengali"]},

        {"poster_id": P, "title": "Tech Support — Razorpay Developer Summit",
         "description": "On-site tech support for hackathon participants. Troubleshoot laptop/Wi-Fi issues, manage developer portal access.",
         "category": "tech_support", "company_name": "Razorpay",
         "venue_name": "MLR Convention Centre, JP Nagar", "city": "Bangalore",
         "event_date": "2026-05-02",
         "shift_start_time": "08:00:00", "shift_end_time": "22:00:00",
         "pay_amount": 2500, "pay_type": "fixed", "slots_total": 4, "slots_filled": 0,
         "requirements_note": "CS background required. Comfortable with Linux and basic networking."},

        {"poster_id": P, "title": "Street Food Fest Coordinator — Indiranagar",
         "description": "Manage vendor setup, public queue, and live music timings at the weekly Sunday street food pop-up.",
         "category": "general_support",
         "venue_name": "100 Feet Road, Indiranagar", "city": "Bangalore",
         "event_date": "2026-03-08",
         "shift_start_time": "16:00:00", "shift_end_time": "22:00:00",
         "pay_amount": 700, "pay_type": "fixed", "slots_total": 3, "slots_filled": 1,
         "languages_required": ["english", "kannada"]},

        {"poster_id": P, "title": "Lead Generation — HDFC Life Insurance Roadshow",
         "description": "Approach visitors at malls and explain HDFC Life term + ULIP plans. Qualified lead target: 15/day.",
         "category": "lead_generation", "company_name": "HDFC Life",
         "venue_name": "Forum Mall, Koramangala", "city": "Bangalore",
         "event_date": "2026-03-15", "event_end_date": "2026-03-20", "is_multi_day": True,
         "shift_start_time": "11:00:00", "shift_end_time": "20:00:00",
         "pay_amount": 800, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
         "requirements_note": "Sales or MBA background preferred. Incentive on every converted lead."},

        {"poster_id": P, "title": "School Annual Day Photographer",
         "description": "Cover VIBGYOR High's annual day with stage performances, award ceremony, and class group photos.",
         "category": "photography", "company_name": "VIBGYOR High School",
         "venue_name": "VIBGYOR High, Marathahalli", "city": "Bangalore",
         "event_date": "2026-02-27",
         "shift_start_time": "14:00:00", "shift_end_time": "20:00:00",
         "pay_amount": 3500, "pay_type": "fixed", "slots_total": 1, "slots_filled": 0,
         "requirements_note": "DSLR with 70-200mm lens required for stage shots."},

        {"poster_id": P, "title": "Zomato Hyperpure Launch — Sampling Drive",
         "description": "Distribute Zomato Hyperpure vegetable and dairy samples to restaurants in Koramangala. 50 restaurants/day.",
         "category": "sampling", "company_name": "Zomato",
         "venue_name": "Koramangala Food Hub", "city": "Bangalore",
         "event_date": "2026-03-10", "event_end_date": "2026-03-12", "is_multi_day": True,
         "shift_start_time": "09:00:00", "shift_end_time": "17:00:00",
         "pay_amount": 1000, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
         "requirements_note": "Must have a two-wheeler. Petrol allowance provided."},

        {"poster_id": P, "title": "Corporate Annual Day Emcee — Infosys",
         "description": "Host Infosys Mysore campus Annual Day for 3000+ employees. Bilingual host preferred (English + Kannada).",
         "category": "anchoring", "company_name": "Infosys",
         "venue_name": "Infosys Mysore Campus", "city": "Mysore",
         "event_date": "2026-04-26",
         "shift_start_time": "16:00:00", "shift_end_time": "22:00:00",
         "pay_amount": 12000, "pay_type": "fixed", "slots_total": 1, "slots_filled": 0,
         "experience_required": True, "languages_required": ["english", "kannada"]},

        {"poster_id": V, "title": "Marathon Registration Desk — Bengaluru 10K",
         "description": "Manage bib collection for 5000+ runners at pre-race kit pickup. Day before the race only.",
         "category": "registration_desk",
         "venue_name": "Kanteerava Stadium, Cubbon Park", "city": "Bangalore",
         "event_date": "2026-03-29",
         "shift_start_time": "08:00:00", "shift_end_time": "18:00:00",
         "pay_amount": 1200, "pay_type": "fixed", "slots_total": 10, "slots_filled": 2,
         "languages_required": ["english", "kannada", "hindi"]},

        {"poster_id": V, "title": "Booth Staff — Auto Expo Chennai",
         "description": "Staff the Tata Motors pavilion at Auto Expo Chennai. Demo EV features, collect test drive sign-ups.",
         "category": "booth_staff", "company_name": "Tata Motors",
         "venue_name": "Chennai Trade Centre, Nandambakkam", "city": "Chennai",
         "event_date": "2026-05-16", "event_end_date": "2026-05-18", "is_multi_day": True,
         "shift_start_time": "10:00:00", "shift_end_time": "18:30:00",
         "pay_amount": 1700, "pay_type": "per_day", "slots_total": 8, "slots_filled": 0,
         "languages_required": ["english", "tamil"]},

        {"poster_id": V, "title": "Promotional Staff — Swiggy Campus Activation",
         "description": "Promote Swiggy Instamart on college campuses. Hand out vouchers, download app demos.",
         "category": "promotional", "company_name": "Swiggy",
         "venue_name": "RV College of Engineering", "city": "Bangalore",
         "event_date": "2026-03-17", "event_end_date": "2026-03-19", "is_multi_day": True,
         "shift_start_time": "09:00:00", "shift_end_time": "17:00:00",
         "pay_amount": 1000, "pay_type": "per_day", "slots_total": 6, "slots_filled": 0,
         "requirements_note": "Must be a current student or recent graduate. Extroverted personality essential."},

        {"poster_id": V, "title": "Hospitality Crew — Oberoi Sunset Dinner Cruise",
         "description": "Serve canapes and beverages on Oberoi's private boat dinner cruise on the Hooghly, Kolkata. One-night gig.",
         "category": "hospitality", "company_name": "The Oberoi",
         "venue_name": "Oberoi Grand Jetty, Strand Road", "city": "Kolkata",
         "event_date": "2026-04-20",
         "shift_start_time": "17:30:00", "shift_end_time": "23:30:00",
         "pay_amount": 2500, "pay_type": "fixed", "slots_total": 4, "slots_filled": 0,
         "dress_code": "White formal uniform (provided)", "languages_required": ["english"],
         "requirements_note": "Must be comfortable on a boat. No sea-sickness allowed!"},
    ]


# ── Generated gigs (role × context combinations) ──────────────────────────────

def build_generated_gigs(uids):
    """Generate ~120 gigs from 10 role templates × 12 event contexts."""
    P, V = uids["priya"], uids["vikram"]

    # (title, category, pay, slots, description)
    ROLES = [
        ("Registration Desk",    "registration_desk", 1200, 8, "Check in attendees, issue passes and wristbands, manage entry queues."),
        ("Ushering Staff",       "ushering",          1100, 6, "Guide attendees to seats, manage crowd flow, and assist with directions."),
        ("Hospitality Crew",     "hospitality",       1300, 6, "Serve food and beverages, maintain catering stations, and assist guests."),
        ("Brand Ambassador",     "brand_ambassador",  1400, 5, "Represent the brand, engage visitors, drive sign-ups and product awareness."),
        ("Booth Staff",          "booth_staff",       1500, 4, "Demo products, collect visitor leads, and answer FAQs at the exhibit booth."),
        ("Social Media Creator", "social_media",      2500, 2, "Capture Reels and Stories, post live updates, and run trending content."),
        ("Photographer",         "photography",       3000, 2, "Document highlights and candid moments; edited selects delivered same day."),
        ("Tech Support",         "tech_support",      2000, 3, "Manage AV setup, operate live-streaming equipment, troubleshoot on-site."),
        ("General Support",      "general_support",   1000, 5, "On-ground help for logistics, crowd management, and ad hoc tasks."),
        ("Sampling Promoter",    "sampling",           900, 6, "Hand out product samples, explain features, and log consumer feedback."),
    ]

    # (context suffix, venue, city, state, date, shift_start, shift_end, pay_type)
    CONTEXTS = [
        ("Biz Conclave — Hyderabad",        "HICC, Hyderabad",             "Hyderabad", "Telangana",   "2026-03-12", "09:00", "18:00", "per_day"),
        ("Product Launch — Pune",           "Novotel Pune, Nagar Road",    "Pune",      "Maharashtra", "2026-03-20", "10:00", "20:00", "fixed"),
        ("Wellness Expo — Delhi",           "Pragati Maidan, Hall 7",      "Delhi",     "Delhi",       "2026-04-03", "10:00", "19:00", "per_day"),
        ("Franchise Expo — Chennai",        "Chennai Trade Centre",        "Chennai",   "Tamil Nadu",  "2026-04-11", "09:30", "18:30", "per_day"),
        ("Design Week — Ahmedabad",         "CEPT Campus, Navrangpura",    "Ahmedabad", "Gujarat",     "2026-04-25", "11:00", "20:00", "fixed"),
        ("EV Auto Show — Bangalore",        "KTPO Convention Centre",      "Bangalore", "Karnataka",   "2026-05-04", "10:00", "19:00", "per_day"),
        ("Music Carnival — Goa",            "Vagator Beach Arena",         "Goa",       "Goa",         "2026-05-17", "16:00", "23:00", "per_day"),
        ("Fintech Summit — Mumbai",         "Jio World Centre, BKC",       "Mumbai",    "Maharashtra", "2026-06-02", "09:00", "18:00", "per_day"),
        ("Gaming Expo — Bangalore",         "Palace Grounds, Jayamahal",   "Bangalore", "Karnataka",   "2026-06-14", "10:00", "21:00", "per_day"),
        ("Health & Fitness Fest — Kolkata", "Eco Park, New Town",          "Kolkata",   "West Bengal", "2026-06-27", "08:00", "17:00", "per_day"),
        ("Book Fair — Jaipur",              "Jaipur Exhibition Centre",    "Jaipur",    "Rajasthan",   "2026-07-11", "10:00", "19:00", "fixed"),
        ("Sustainability Summit — Pune",    "Symbiosis International Uni", "Pune",      "Maharashtra", "2026-07-24", "09:00", "17:00", "per_day"),
    ]

    gigs = []
    for i, (r_title, r_cat, r_pay, r_slots, r_desc) in enumerate(ROLES):
        for j, (c_name, c_venue, c_city, c_state, c_date, c_start, c_end, c_ptype) in enumerate(CONTEXTS):
            gigs.append({
                "poster_id":        P if (i + j) % 2 == 0 else V,
                "title":            f"{r_title} — {c_name}",
                "description":      r_desc,
                "category":         r_cat,
                "venue_name":       c_venue,
                "city":             c_city,
                "state":            c_state,
                "event_date":       c_date,
                "shift_start_time": c_start + ":00",
                "shift_end_time":   c_end   + ":00",
                "pay_amount":       r_pay,
                "pay_type":         c_ptype,
                "slots_total":      r_slots,
                "slots_filled":     0,
                "status":           "open",
            })
    return gigs


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    clean = "--clean" in sys.argv

    print("╔══════════════════════════════════════╗")
    print("║      Kriya Dev Seed Script           ║")
    print("╚══════════════════════════════════════╝\n")

    # ── 0. Clean ──────────────────────────────────────────────────────────────
    if clean:
        print("Cleaning existing seed users...")
        for key, phone in SEED_PHONES.items():
            uid = _find_user_by_email(f"{phone}@kriya.dev")
            if uid:
                delete_auth_user(uid)
                print(f"  ✓ Deleted {phone}")
            else:
                print(f"  ~ Not found {phone}")
        print()

    # ── 1. Auth users ─────────────────────────────────────────────────────────
    print("1. Creating auth users...")
    DISPLAY_NAMES = {
        "priya":  "Priya Sharma",
        "vikram": "Vikram Nair",
        "rahul":  "Rahul Gupta",
        "aisha":  "Aisha Khan",
        "suresh": "Suresh Patel",
    }
    user_ids = {}
    for key, phone in SEED_PHONES.items():
        uid, created = create_auth_user(phone, DISPLAY_NAMES[key])
        user_ids[key] = uid
        tag = "created" if created else "exists"
        print(f"  {'✓' if created else '~'} [{tag}] {DISPLAY_NAMES[key]}  ({phone}@kriya.dev)")
    time.sleep(1)

    # ── 2. Profiles ───────────────────────────────────────────────────────────
    print("\n2. Updating profiles...")
    profile_data = {
        "priya": {
            "first_name": "Priya", "last_name": "Sharma", "display_name": "Priya Sharma",
            "date_of_birth": "1998-04-12", "gender": "female",
            "city": "Bangalore", "state": "Karnataka",
            "bio": "Event coordinator with 5 years of experience. Connecting talented students with exciting gig opportunities.",
            "languages": ["english", "hindi", "kannada"],
            "skills": ["event management", "communication", "coordination"],
            "worker_reputation": 4.8, "poster_reputation": 4.9,
            "total_gigs_completed": 12, "total_gigs_posted": 28,
            "reliability_score": 0.97, "is_verified": True, "is_student": False,
        },
        "vikram": {
            "first_name": "Vikram", "last_name": "Nair", "display_name": "Vikram Nair",
            "date_of_birth": "1995-09-22", "gender": "male",
            "city": "Bangalore", "state": "Karnataka",
            "bio": "Marketing professional and startup founder. Always looking for energetic brand ambassadors.",
            "languages": ["english", "hindi", "malayalam"],
            "skills": ["marketing", "branding", "social media"],
            "poster_reputation": 4.7, "total_gigs_posted": 15,
            "reliability_score": 1.0, "is_verified": True, "is_student": False,
        },
        "rahul": {
            "first_name": "Rahul", "last_name": "Gupta", "display_name": "Rahul Gupta",
            "date_of_birth": "2003-07-15", "gender": "male",
            "city": "Bangalore", "state": "Karnataka",
            "bio": "3rd year CS student at PESIT. Energetic and reliable — love working events!",
            "languages": ["english", "hindi"],
            "skills": ["communication", "tech support", "ms office"],
            "is_student": True, "college_name": "PESIT South Campus",
            "college_year": 3, "course": "B.Tech Computer Science",
            "worker_reputation": 4.5, "total_gigs_completed": 8, "reliability_score": 0.92,
        },
        "aisha": {
            "first_name": "Aisha", "last_name": "Khan", "display_name": "Aisha Khan",
            "date_of_birth": "2001-02-28", "gender": "female",
            "city": "Bangalore", "state": "Karnataka",
            "bio": "Final year MBA at Christ University. Experienced in hospitality and brand ambassador roles.",
            "languages": ["english", "hindi", "urdu", "kannada"],
            "skills": ["hospitality", "customer service", "brand ambassador", "anchoring"],
            "is_student": True, "college_name": "Christ University",
            "college_year": 2, "course": "MBA Marketing",
            "worker_reputation": 4.9, "total_gigs_completed": 23,
            "reliability_score": 0.99, "is_verified": True,
        },
        "suresh": {
            "first_name": "Suresh", "last_name": "Patel", "display_name": "Suresh Patel",
            "date_of_birth": "2002-11-05", "gender": "male",
            "city": "Bangalore", "state": "Karnataka",
            "bio": "2nd year Commerce at Jain University. New to gigs but hardworking and always on time.",
            "languages": ["english", "hindi", "gujarati"],
            "skills": ["registration desk", "general support", "data entry"],
            "is_student": True, "college_name": "Jain University",
            "college_year": 2, "course": "B.Com",
            "total_gigs_completed": 2, "reliability_score": 1.0,
        },
    }
    for key, data in profile_data.items():
        _patch("profiles", f"eq.{user_ids[key]}", data)
        print(f"  ✓ {data['display_name']}")

    # ── 3. Events + gigs ──────────────────────────────────────────────────────
    print("\n3. Creating events and gigs...")

    events_data = build_events(user_ids)
    total_events = 0
    total_gigs   = 0

    for ev in events_data:
        gig_templates = ev.pop("gigs")
        try:
            ev_id = _insert("events", ev)
            total_events += 1
        except RuntimeError as e:
            print(f"  ✗ Event failed: {e}")
            continue

        short = ev["title"][:55]
        print(f"  ✓ Event: {short}  ({ev_id})")

        for gig_tmpl in gig_templates:
            # Inherit event-level fields
            gig = {
                "poster_id":    ev["poster_id"],
                "event_id":     ev_id,
                "venue_name":   ev["venue_name"],
                "city":         ev["city"],
                "event_date":   ev["event_date"],
                "status":       "open",
                "slots_filled": gig_tmpl.pop("slots_filled", 0),
                **gig_tmpl,
            }
            if "event_end_date" in ev and "event_end_date" not in gig:
                gig["event_end_date"] = ev["event_end_date"]
            if "is_multi_day" in ev and "is_multi_day" not in gig:
                gig["is_multi_day"] = ev["is_multi_day"]
            try:
                _insert("gigs", gig)
                total_gigs += 1
                print(f"      ✓ {gig['title']}")
            except RuntimeError as e:
                print(f"      ✗ {gig_tmpl.get('title','?')} failed: {e}")

    # ── 4. Standalone gigs ────────────────────────────────────────────────────
    print("\n4. Creating standalone gigs...")
    standalone = build_standalone_gigs(user_ids)

    for gig in standalone:
        gig.setdefault("status", "open")
        gig.setdefault("slots_filled", 0)
        gig.setdefault("is_multi_day", False)
        try:
            _insert("gigs", gig)
            total_gigs += 1
            print(f"  ✓ {gig['title']}")
        except RuntimeError as e:
            print(f"  ✗ {gig.get('title','?')} failed: {e}")

    # ── 5. Generated gigs ─────────────────────────────────────────────────────
    print("\n5. Creating generated gigs (role × context combos)...")
    generated = build_generated_gigs(user_ids)
    gen_ok = 0
    for gig in generated:
        try:
            _insert("gigs", gig)
            total_gigs += 1
            gen_ok += 1
        except RuntimeError as e:
            print(f"  ✗ {gig.get('title','?')} failed: {e}")
    print(f"  ✓ {gen_ok}/{len(generated)} generated gigs inserted")

    # ── 6. Applications ───────────────────────────────────────────────────────
    # Fetch first few open gigs to apply to
    print("\n5. Creating sample applications...")
    gigs_result, _ = _req("GET", "/rest/v1/gigs", params={
        "status": "eq.open",
        "order": "created_at.asc",
        "limit": "20",
        "select": "id,title,poster_id",
    })
    open_gigs = gigs_result if isinstance(gigs_result, list) else []

    # Workers apply to gigs not posted by them
    applicants = [user_ids["rahul"], user_ids["aisha"], user_ids["suresh"]]
    poster_ids = {user_ids["priya"], user_ids["vikram"]}

    ok = skip = err = 0
    sample_messages = [
        "Really excited about this opportunity! I have relevant experience and can start immediately.",
        "I've done similar work before and I'm very comfortable with the role requirements.",
        "Looking forward to contributing to this event. Available and very motivated.",
        "This aligns perfectly with my skills. I'm reliable, punctual, and enthusiastic.",
        "I'd love to be part of this. I have experience in similar settings.",
    ]
    import random
    app_count = 0
    for gig in open_gigs:
        if gig["poster_id"] not in poster_ids:
            continue
        for i, applicant_id in enumerate(applicants):
            if app_count >= 25:
                break
            result, status = _req("POST", "/rest/v1/gig_applications", {
                "gig_id": gig["id"],
                "applicant_id": applicant_id,
                "message": sample_messages[(app_count + i) % len(sample_messages)],
                "status": "pending",
            })
            if status in (200, 201):
                ok += 1; app_count += 1
            elif status == 409:
                skip += 1
            else:
                err += 1
        if app_count >= 25:
            break

    # ── Done ──────────────────────────────────────────────────────────────────
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  Seed complete!                                              ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"\n  Events:       {total_events}")
    print(f"  Gigs:         {total_gigs}")
    print(f"  Applications: {ok} created, {skip} skipped, {err} errors")
    print(f"\n  Login with OTP 123456 using any of these phones:")
    print(f"\n  ┌──────────────┬─────────────────────────┬──────────┐")
    print(f"  │ Phone        │ Name                    │ Role     │")
    print(f"  ├──────────────┼─────────────────────────┼──────────┤")
    print(f"  │ 9001000001   │ Priya Sharma            │ Poster   │")
    print(f"  │ 9001000002   │ Vikram Nair             │ Poster   │")
    print(f"  │ 9001000003   │ Rahul Gupta             │ Worker   │")
    print(f"  │ 9001000004   │ Aisha Khan              │ Worker   │")
    print(f"  │ 9001000005   │ Suresh Patel            │ Worker   │")
    print(f"  └──────────────┴─────────────────────────┴──────────┘")
    print()


if __name__ == "__main__":
    main()
