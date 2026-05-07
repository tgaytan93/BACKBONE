# PHASE 5 RESEARCH

Client-side website ownership pain points, competitive landscape, and strategic implications for the Backbone DevOps panel.

Compiled from web research, May 2026.

---

## THE BIG PICTURE STAT

64% of small business owners say updating their website is a major challenge. 24% say the cost of maintaining it is a significant hurdle. (PixoLabo, 2024)

Roughly one-third of small business owners maintain their websites themselves, and most neglect basic functionality consumers expect (responsive design, fresh content, social integration). Another 29% don't have a website at all.

This is the entire market thesis for Backbone in two numbers.

---

## CORE PAIN POINTS (RANKED BY HOW MUCH THEY MATTER FOR PHASE 5)

### 1. "I have to email my developer to change a phone number"

The most-cited friction point in the research. Across multiple sources, the same complaint surfaces: small business owners pay for a custom site, then become permanently dependent on the developer for any change. A 30-second update becomes a 2-day delay plus a fee.

The Shissou Creative writeup describes the exact pattern Backbone is targeting:
- Owner pays for a great custom site
- Looks professional, customers love it
- Then needs to update phone number, hours, or add a project photo
- Now they're emailing the developer, waiting days, paying $50-100 per micro-update
- "Most custom-built websites are like a finished painting — they look great, but you can't change anything without the artist"

Implication for Phase 5: the DevOps panel's primary purpose is letting the owner do these small text/image/contact updates themselves, instantly. Everything else is secondary.

### 2. Fear of breaking the site

Across the Alignable forum threads and multiple agency writeups, the same emotional driver shows up: owners avoid making changes because they're afraid of breaking something. They've seen WordPress sites go down after plugin updates. They've forgotten passwords and gotten locked out. They've had developers ghost them, leaving them stranded.

Quote that summarizes the mindset (Shissou Creative): the design and layout stay locked in place, the owner only edits content inside the design, like replacing the text in a picture frame without touching the frame itself.

Implication for Phase 5: design constraint locks. The owner edits content, not structure. Layout, typography, navigation, color systems are protected. They literally cannot break the site through normal use, because the panel doesn't expose those controls.

### 3. Time poverty + lack of technical skill

Most small business owners are wearing five hats. Updating a website is "the thing I'll do this weekend" that never gets done, partly because they don't have time and partly because every CMS has a learning curve.

WordPress is technically free but practically expensive: needs constant plugin updates, security patches, manages a host of vulnerabilities. The "Sure, WordPress is easy! Once you know how to use it!" quote captures the gap between marketing and reality.

Implication for Phase 5: the panel must be usable in 30 seconds, not 30 minutes. No learning curve. The owner clicks a thing, it changes, they see it. No staging, no preview/publish workflow for basic edits. Direct manipulation.

### 4. Vendor lock-in and ownership confusion

The "Web Developer Disappears" research highlighted a specific pain point: when developers go MIA or refuse to hand over credentials, business owners discover they don't actually own their site. Domain registered to the developer's account. Hosting bundled under the developer's contract. No DNS access. No CMS login. They paid for a site they can't actually control.

The thesitewizard.com writeup is brutal: an unscrupulous developer can effectively hold a business hostage by controlling domain, hosting, and email — all things the owner thought they bought.

Implication for Phase 5: ownership transparency is a feature, not an afterthought. The owner should always own the domain (registered to their account, not Backbone's), have admin access to the deployment platform, and have a documented "if Backbone disappears tomorrow, here's how to keep running" handoff doc. This becomes a sales differentiator: "you own this, not us."

### 5. Cost unpredictability

Maintenance costs are a major hurdle. WordPress sites accumulate plugin subscriptions, security tools, hosting fees, and developer retainers that aren't obvious upfront. Wix locks you into their pricing structure. Squarespace is cheap until you outgrow it.

Owners want fixed, predictable costs. Surprise bills are deeply unwelcome.

Implication for Phase 5: client hosting setup must be predictable. Vercel Pro at $20/month is the typical entry point, plus Supabase Pro at $25/month if needed = $45/month baseline. Bandwidth overage fees on Vercel can add up fast for media-heavy sites — Vercel charges $0.15/GB after the 100GB included on Pro. For an HVAC-style site (mostly text, occasional photos, low traffic), this is a non-issue. For a busy site, monitoring is required.

### 6. WordPress update fatigue

Multiple sources call out the WordPress maintenance treadmill: core updates, plugin updates, theme updates, security patches, all of which can break the site at any time. The Green Light Studio writeup is direct: "Your site WILL break if you don't update it. But updating everything blindly can cause even more issues."

This is a major reason custom-built (non-WordPress) sites are increasingly attractive. Backbone's positioning of "real custom code, not WordPress" maps directly to this pain point.

Implication for Phase 5: keep the platform genuinely custom. No WordPress, no Wix-like locked ecosystem. Next.js + Supabase + Vercel = no plugin compatibility nightmares, no surprise breakages from upstream updates, no security patches to chase.

### 7. The "I want to add a page" problem

Beyond text updates, owners eventually want bigger structural changes: adding a service page, a new location, a team member, a testimonials section. Most CMS platforms make this hard or charge extra. Custom sites without a panel make it impossible without developer help.

Implication for Phase 5: the panel needs page creation as a core feature, not a power-user one. Templates for common page types (service detail, location, about, blog post) that the owner picks from. Drag-and-drop content blocks, but with constrained layout choices so the page automatically looks like it belongs to the rest of the site.

---

## COMPETITIVE LANDSCAPE (WHAT THE OWNER IS COMPARING YOU TO)

### Wix / Squarespace
- Cheap entry ($16-30/month), drag-and-drop editor, no developer needed
- Owners can do anything themselves
- Tradeoffs: locked into the ecosystem, mediocre SEO, harder to migrate out, generic look
- The Backbone angle: you don't have to live with their templates and limitations

### WordPress (self-hosted or WordPress.com)
- Most popular CMS, 43% of all websites
- Maximum flexibility, plugin ecosystem
- Tradeoffs: maintenance burden, security risk, slower performance, plugin conflicts
- The Backbone angle: same flexibility without the maintenance treadmill

### Webflow
- Visual designer, custom design without code
- Better for marketing-driven brands
- Tradeoffs: steeper learning curve, more expensive, designer-targeted not owner-targeted
- The Backbone angle: Webflow expects the owner to be design-savvy. Backbone serves the owner who wants to NOT think about design at all.

### HubSpot CMS
- Tightly integrated with HubSpot CRM
- Compelling if the business is already in HubSpot
- Tradeoffs: expensive, marketing-overkill for small SMB
- The Backbone angle: the owner doesn't need a CRM platform. They need a website that updates.

### Custom dev shops (the actual competitors)
- Build a site, hand it off, charge for every update afterward
- Backbone's primary positioning is differentiation from THIS, not from CMS platforms
- The win: owner gets premium custom code AND a panel they can actually use

---

## TYLER'S PHASE 5 IDEAS (REVIEWED)

### "Simplified DevOps panel" instead of full power
You said: "We can have something like a simplified version of a dev ops panel that is just super UI modified. Really simple interface to essentially change whatever you want on the site while not being anything too extreme."

Strongly correct instinct. The research backs this up directly. The risk of giving non-technical owners full DevOps power is real. The Shissou Creative quote captures the right mental model: edit content inside the design, don't touch the design.

What this means concretely:
- Edit text, images, hours, contact info, prices, testimonials: yes
- Add/remove/reorder pages: yes (with templates)
- Change colors, fonts, themes: maybe yes (within constrained palette options)
- Edit layout, structure, code, integrations, environment: NO

Maxwell HQ in Serenyx probably gives you full DevOps power because the user is YOU. Backbone clients are HVAC owners. Different audience, different ceiling.

### "Cloud costs money" concern
You said: "I have to have the daemon running, or use the cloud if it's not. But the cloud cost money."

Real concern, but the math is more favorable than you might think for SMB clients.

A typical Backbone client site (HVAC, restaurant, small services business) gets low traffic — often under 100GB bandwidth/month. That fits well within Vercel Pro's $20/month inclusive limit.

For the DevOps panel itself:
- Vercel Pro: $20/month (covers the panel's compute + the site's compute)
- Supabase Pro: $25/month (covers the database + storage + auth)
- Total baseline: $45/month per client

Edits made via the panel are just database writes (cheap) plus Vercel function invocations (covered in the included plan). Even an aggressive editor making 50 changes a day for 30 days = 1,500 invocations, well within the 1M Vercel includes monthly.

The realistic risk isn't compute cost — it's bandwidth on media uploads. If a client uploads 50 high-res photos of their work, those photos get served on every page view, and bandwidth scales with traffic. For an HVAC business with 1,000 visitors/month, this is fine. For a contractor with viral TikTok-driven traffic, less fine.

Mitigation: image optimization on upload (resize, compress, convert to WebP automatically), CDN caching (Vercel includes), and a reasonable file size limit per upload (5MB or so). Build these in from day one and bandwidth becomes a non-issue at SMB scale.

What you should NOT do is host the daemon as a persistent process. Vercel serverless is cheaper and simpler at this scale than running an always-on daemon.

### "That's a lot of power to give them"
You said: "Claude in Serenyx knows how to not break things but the user could send themselves down a rabbit hole of fucking things up."

Yes, and this is where the simplified panel direction becomes critical. The owner should not have access to anything that could break the site. Specifically:

- No file system access (no editing config files, env vars, code)
- No database direct access (no editing schemas, running queries, modifying RLS policies)
- No deployment controls (no triggering rebuilds, rolling back, changing branches)
- No third-party integration management (no editing API keys, webhook URLs, etc.)
- No domain/DNS controls

These are all things YOU manage on the backend. The client-facing panel is a thin layer of curated controls over a small, safe surface area.

If the client wants something that requires those backend controls, they email Backbone and you handle it. This is fine because those requests are rare for normal SMB sites.

---

## RECOMMENDED PHASE 5 SCOPE (MVP for Conway)

Based on the research, here's what the v1 panel should include for an HVAC-style client. Save advanced features for v2 after real client feedback.

### Tier 1 features (must-have, ship in MVP)
- **Edit basic content** — text, headings, hero copy, service descriptions, contact info, hours
- **Manage media** — upload images for hero, services, gallery; resize/compress on upload; replace existing
- **Edit page metadata** — page titles, meta descriptions, OG images for social sharing
- **Manage simple lists** — services offered, service areas, testimonials, FAQ items
- **Form submissions view** — read-only view of inbound contact form leads (mirrors the Backbone admin pattern you already built)
- **Basic site settings** — logo, business name, tagline, social links

### Tier 2 features (nice-to-have, v2 after Conway gives feedback)
- Add/remove/reorder pages (with constrained templates)
- Edit theme color and typography (within a small palette)
- Blog post creation
- Basic analytics view (page views, top sources)

### Tier 3 features (defer indefinitely)
- Full layout editing
- Custom code injection
- Plugin/integration management
- A/B testing
- Multi-user permissions

The discipline matters. Every feature added to the panel is a feature you maintain forever. Start small, ship to Conway, get real feedback, then expand.

---

## ARCHITECTURAL QUESTIONS THE SERENYX WRITEUP NEEDS TO ANSWER

When the Serenyx Claude Code writeup comes back, these are the specific questions to answer:

1. **What does Maxwell HQ actually let users do?** Is it edit-content level, or full DevOps level?
2. **What's the database structure?** Is it one Supabase project per league, or one shared database with tenant_id columns?
3. **How does auth scope work?** When a user logs into Maxwell HQ, what do they see vs not see?
4. **What is the daemon for, technically?** What runs only there?
5. **What was the build effort for Maxwell HQ?** Hours, weeks, components.
6. **What broke or got rebuilt?** Painful patterns to avoid in Backbone v2.

Once you have that, we'll cross-reference with the SMB pain points above and design Phase 5 properly.

---

## STRATEGIC POSITIONING NOTES

A few framing choices that map well to the research:

### Position the panel as ownership, not as software
The pain point isn't "I want a CMS." The pain point is "I want to feel like I own my own business website without being held hostage by a developer." Frame the panel as the artifact of ownership: "this is your site, here's the steering wheel."

### Make the panel itself part of the deliverable
Not an add-on, not a separate product. Every Backbone build ships with the panel. This is the differentiator from custom dev shops who hand off a black box. "You don't just get a site, you get the keys."

### Don't compete with Wix on price
Backbone is premium. The panel is part of the premium offering, not a way to make Backbone look cheap. The Vervology research nailed it: small business owners shouldn't have to navigate everything alone, and most agencies focus on big corporations and overlook the people building businesses from the ground up.

### "Real onboarding" matters
Multiple sources emphasized: owners want to feel competent with their tools. Building a great panel is half the work; teaching the owner to use it is the other half. Plan onboarding sessions (recorded video walkthrough + live handoff call) as part of every Tier 2/3 deliverable.

---

## NEXT STEPS

1. Wait for Serenyx Claude Code writeup to land at `ARCHITECTURE-WRITEUP.md` in that project
2. Cross-reference Serenyx architecture against the pain points and v1 scope above
3. Draft Phase 5 architecture doc for Backbone (multi-tenancy approach, panel feature spec, deployment model, cost projections)
4. Decide what's portable from Serenyx vs what's rebuilt for SMB clients
5. Prioritize MVP features for Conway specifically
6. Build prompts for Phase 5 implementation

We're not writing code yet. This is the spec phase. Get it right here and the build phase goes 3x faster.
