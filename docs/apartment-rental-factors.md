# Apartment Rental Decision Factors

Comprehensive list of factors people consider when searching for an apartment to rent, scored by importance (1–10 scale, 10 = deal-breaker for most people). Includes coverage status relative to the optim_house app.

---

## Tier 1 — Deal-Breakers (8–10)

| # | Factor | Score | Details | In App? |
|---|--------|-------|---------|---------|
| 1 | **Monthly Rent / Affordability** | **10** | The single most filtering criterion. Most people have a hard ceiling (rule of thumb: rent < 30% of gross income). Includes base rent + utilities + service charges. | Yes (`budget`, weight 9) |
| 2 | **Location / Commute to Work** | **9** | Daily commute time is the #1 quality-of-life predictor after rent. People set a maximum tolerable commute (typically 30–45 min). | Yes (`commute`, weight 8 for office) |
| 3 | **Safety / Crime Rate** | **9** | Neighborhood safety is a hard filter, especially for families and women living alone. People check crime stats, lighting, general "feel" of the area at night. | Partially (`neighborhood`, but not explicitly safety-scored) |
| 4 | **Number of Bedrooms / Unit Size** | **9** | Non-negotiable based on household size. Studio vs 1BR vs 2BR is decided before search even begins. This is a unit-level filter, not a location one. | No |
| 5 | **Lease Terms & Availability** | **8** | Move-in date, lease duration (12 months vs flexible), break clauses, renewal terms. A perfect apartment with wrong timing is useless. | No |

---

## Tier 2 — High Priority (6–8)

| # | Factor | Score | Details | In App? |
|---|--------|-------|---------|---------|
| 6 | **Proximity to Public Transit** | **8** | Metro/bus stop within walking distance. Critical in cities where driving is impractical or expensive. The commute criterion partially captures this via mode. | Partially (commute mode = transit) |
| 7 | **Parking Availability** | **7** | Dedicated parking spot, street parking ease, cost of parking. Especially critical in cities like Dubai where car dependency is high. | No |
| 8 | **Nearby Amenities (Grocery, Gym, Cafe, etc.)** | **7** | Walkable access to daily essentials. People strongly prefer a supermarket within 5–10 min. | Yes (`amenities`, weight 6) |
| 9 | **Neighborhood Vibe / Livability** | **7** | Walkability, greenery, cleanliness, community feel, demographics. Some want nightlife, others want quiet residential. Highly subjective but universally considered. | Yes (`neighborhood`, weight 5) |
| 10 | **Noise Level** | **7** | Highway noise, airport flight paths, construction zones, nightlife noise, thin walls. A top-3 reason people move out of an apartment. | Yes (`noise`, weight 4) |
| 11 | **Natural Light & Unit Orientation** | **7** | South/west-facing (or north in southern hemisphere), floor level, window count. People underestimate this until they live in a dark apartment. | No (unit-level) |
| 12 | **Proximity to Schools** | **7** | For families with children — school quality and distance is often the #1 factor, even above rent. For singles, irrelevant. Very persona-dependent. | Partially (commute preset "school") |
| 13 | **Building Quality & Maintenance** | **6** | Age of building, responsiveness of management, common area upkeep, elevator reliability. Older buildings = more issues. | No |
| 14 | **Pet Policy** | **6** | For pet owners, this is a hard 10/10 filter. For non-pet-owners, irrelevant. ~30-40% of renters have pets. | No |

---

## Tier 3 — Medium Priority (4–6)

| # | Factor | Score | Details | In App? |
|---|--------|-------|---------|---------|
| 15 | **In-Unit Laundry** | **6** | Washer/dryer in unit vs shared vs laundromat. In-unit laundry consistently ranks as a top amenity in surveys. | No (unit-level) |
| 16 | **Air Conditioning / Heating** | **6** | Central A/C vs window units vs none. Critical in extreme climates (Dubai, Middle East, southern US). | No (unit-level) |
| 17 | **Internet / Connectivity** | **6** | Fiber availability, ISP options, mobile coverage. Work-from-home has pushed this from 4 to 6 post-2020. | No |
| 18 | **Kitchen Quality** | **5** | Dishwasher, counter space, gas vs electric stove, storage. Important for people who cook daily. | No (unit-level) |
| 19 | **Storage Space** | **5** | Closet space, basement/attic storage, general square-footage efficiency. | No (unit-level) |
| 20 | **Proximity to Healthcare** | **5** | Hospital or clinic within 10–15 min. More important for elderly, families with young children, or people with chronic conditions. | No (could be an amenity category) |
| 21 | **Commute to Partner / Family** | **5** | Second commute destination. Often overlooked but affects weekend quality of life significantly. | Yes (commute presets: partner, family) |
| 22 | **Floor Level** | **5** | Higher floors = better views, less noise, more light, but harder move-in. Ground floor = convenience but security/privacy concerns. | No (unit-level) |
| 23 | **Security Features** | **5** | Gated community, doorman/concierge, CCTV, secure entry. Correlates with safety but is building-specific. | No |
| 24 | **Deposit & Move-In Costs** | **5** | Security deposit (1–3 months), agent fees, first/last month upfront. High deposits can disqualify otherwise affordable apartments. | No |

---

## Tier 4 — Nice-to-Have (2–4)

| # | Factor | Score | Details | In App? |
|---|--------|-------|---------|---------|
| 25 | **Gym / Pool / Building Amenities** | **4** | On-site fitness center, pool, rooftop, coworking space. Nice bonus but rarely a deciding factor. | Partially (amenities category) |
| 26 | **Views / Aesthetics** | **4** | Sea view, city skyline, park view. Emotional factor — people pay 10–20% premium for good views. | No |
| 27 | **Proximity to Airport** | **4** | For frequent travelers. If you fly 2+ times/month, being 20 min vs 60 min from the airport adds up. | Yes (commute preset "airport", weight 4) |
| 28 | **Furnished vs Unfurnished** | **4** | Furnished is preferred for short-term/expats; unfurnished for long-term renters who have their own furniture. | No (unit-level) |
| 29 | **Walkability Score** | **4** | General walk-score of the neighborhood. Correlates with amenities + transit but is its own lifestyle factor. | Partially (amenities + neighborhood) |
| 30 | **Proximity to Green Space / Parks / Beach** | **4** | Park within 10-min walk. Strongly correlated with mental health and perceived livability. | Partially (amenity: park) |
| 31 | **Utility Costs** | **3** | Electricity, water, district cooling (Dubai-specific), internet. Can add 10–25% on top of base rent. | No |
| 32 | **Landlord Reputation** | **3** | Responsive, fair, respectful of privacy. Hard to evaluate pre-move but a top reason for lease non-renewal. | No |
| 33 | **Smoking Policy** | **2** | Building-wide or floor-specific smoking rules. | No |
| 34 | **Sustainable / Green Features** | **2** | Energy efficiency, solar, recycling, EV charging. Growing in importance but still a "bonus" for most. | No |

---

## App Coverage Summary

### Covered well
- Rent budget, commute (multi-destination), amenities, neighborhood quality, noise

### Partially covered / could enhance
- Safety (as a distinct sub-score of neighborhood)
- Public transit proximity (as a standalone metric beyond commute)
- Walkability score
- Healthcare proximity (as an amenity category)
- Parks/green space (as amenity subcategory)

### Not covered but location-dependent and scoreable
- Parking availability
- Internet/fiber coverage
- Proximity to healthcare
- School quality ratings
- Building density / views potential

### Not coverable at grid level (unit-level filters)
- Bedrooms, floor level, furnishing, laundry, A/C, kitchen, pet policy, lease terms, deposit

---

## TODO — Location-Specific Factors

Factors that can be scored on the spatial grid (neighborhood / area level).

- [ ] **Safety / Crime Rate** (score 9) — Add as a first-class criterion with real crime data (currently only via AI stub with static neighborhood scores)
- [ ] **Public Transit Proximity** (score 8) — Add standalone "distance to nearest metro/bus stop" metric, separate from commute mode
- [ ] **Parking Availability** (score 7) — Score areas by street parking density, public parking lots, or zoning data
- [ ] **Proximity to Schools** (score 7) — Enhance with school quality ratings, not just OSM POI count
- [ ] **Internet / Fiber Coverage** (score 6) — Integrate ISP coverage maps or fiber availability data
- [ ] **Proximity to Healthcare** (score 5) — Promote hospital/clinic from generic amenity to a standalone criterion with distance-based scoring
- [ ] **Walkability Score** (score 4) — Integrate Walk Score API or compute from street network + amenity density
- [ ] **Proximity to Green Space / Parks / Beach** (score 4) — Upgrade from POI count to actual green-space area coverage metric
- [ ] **Views / Aesthetics** (score 4) — Score by elevation data, building density, proximity to waterfront/skyline
- [ ] **Utility Costs** (score 3) — Regional average utility cost data per zone
- [ ] **Sustainable / Green Features** (score 2) — EV charging station density, solar adoption rates by area

---

## TODO — Apartment-Specific Factors

Factors that are per-unit / per-listing and cannot be scored at the grid level. These would require listing-level data (e.g. from a property API or user input filters).

- [ ] **Number of Bedrooms / Unit Size** (score 9) — Hard filter by household size (studio / 1BR / 2BR / 3BR+)
- [ ] **Lease Terms & Availability** (score 8) — Filter by move-in date, lease duration, break clauses
- [ ] **Natural Light & Unit Orientation** (score 7) — Filter/rank by facing direction (south/west preferred), floor level, window count
- [ ] **Building Quality & Maintenance** (score 6) — Building age, management rating, common area condition
- [ ] **Pet Policy** (score 6) — Hard filter for pet owners (cats/dogs/size restrictions)
- [ ] **In-Unit Laundry** (score 6) — Filter: in-unit washer/dryer vs shared vs none
- [ ] **Air Conditioning / Heating** (score 6) — Filter by A/C type (central / split / window / none)
- [ ] **Kitchen Quality** (score 5) — Dishwasher, counter space, stove type
- [ ] **Storage Space** (score 5) — Closet count, basement/attic storage availability
- [ ] **Floor Level** (score 5) — Preference for high/mid/low floor
- [ ] **Security Features** (score 5) — Gated entry, doorman, CCTV, secure parking
- [ ] **Deposit & Move-In Costs** (score 5) — Security deposit amount, agent fees, upfront costs
- [ ] **Gym / Pool / Building Amenities** (score 4) — On-site fitness, pool, rooftop, coworking
- [ ] **Furnished vs Unfurnished** (score 4) — Filter by furnishing level (fully / partially / unfurnished)
- [ ] **Landlord Reputation** (score 3) — Rating / review score of landlord or management company
- [ ] **Smoking Policy** (score 2) — Building-wide or floor-specific smoking rules
