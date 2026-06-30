---
title: "Impossible List"
description: "A living list of things Konrad Wright wants to build, learn, and do — designed to keep growing rather than get finished."
layout: "impossible-list"
updated: 2026-06-30
lead: "Not a bucket list you complete — one you keep adding to. The idea (borrowed from Joel Runyon) is that the list should always outrun you."
groups:
  - label: "Build"
    items:
      - { text: "Ship a product to 10,000 paying users", done: false }
      - { text: "Open-source a tool that someone I've never met depends on", done: true }
      - { text: "Get a Chrome extension through Google's review on the first pass", done: false }
      - { text: "Run a business that pays me while I sleep", done: true }
  - label: "Learn"
    items:
      - { text: "Win an argument with the Rust borrow checker without a clone()", done: false }
      - { text: "Give a conference talk", done: false }
      - { text: "Read 50 books in a single year", done: false }
  - label: "Live"
    items:
      - { text: "Visit all seven continents", done: false }
      - { text: "Learn to free-dive past 20 meters", done: false }
      - { text: "Build something with my hands that outlives the warranty", done: true }
# Games — a checklist (crossed out when 100%-ed). Completed entries carry a
# rating (of 5), a blurb, and shot (PNG in assets/games/, optimized to WebP at
# build); clicking one opens the drill-down modal. To-do entries are plain.
games:
  label: "Games"
  items:
    - title: "Super Mario 64"  # 1996
      console: "N64"
      done: true
      rating: 3.0
      shot: "super-mario-64.png"
      blurb: "I can see the effect this had on later games, I never beat it as a kid, in fact, I never even got far. But it's beat and was extremely charming!"
    - title: "Diddy Kong Racing"  # 1997
      console: "N64"
      done: true
      rating: 2.5
      shot: "diddy-kong-racing-64.png"
      blurb: "A nostalgic whimsical trip, but toon racing games have come a long way since then."
    - title: "The Legend of Zelda: Ocarina of Time"  # 1998
      console: "N64"
      done: true
      rating: 4.0
      shot: "zelda-ocarina-of-time.png"
      blurb: "This was a defining moment in my childhood, and the exploring of Hyrule feels like a stroll through my favorite park. Felt bigger as a kid, but nothing wrong with a smaller world, things felt intentional."
    - title: "Pokémon Snap"  # 1999
      console: "N64"
      done: true
      rating: 2.5
      shot: "pokemon-snap.png"
      blurb: "Nostalgia Trip on Wheels, all the small things came back to me so the rediscovery which was core to the gameplay was lost on the replay so I didn't get to sit with this game for long."
    - title: "Donkey Kong 64"  # 1999
      console: "N64"
      done: true
      rating: 3.0
      shot: "donkey-kong-64.png"
      blurb: "WOW the Collectible Count was INSANE. Still the level design was peak, and DK Island feels like visiting a summer home you used to see as a kid."
    - title: "Kirby 64: The Crystal Shards"  # 2000
      console: "N64"
      done: true
      rating: 2.5
      shot: "kirby-crystal-shards.png"
      blurb: "I'm not much of a side-scrolling platform guy, but the constant asking 'What does this combination do?' is really fun!"
    - { title: "The Legend of Zelda: Oracle of Ages", done: false, console: "GBC" }  # 2001
    - { title: "The Legend of Zelda: Oracle of Seasons", done: false, console: "GBC" }  # 2001
    - { title: "Golden Sun", done: false, console: "GBA" }  # 2001
    - title: "Sonic Adventure 2: Battle (Chao Garden)"  # 2002
      console: "GCN"
      done: true
      rating: 3.0
      shot: "sonic-adventure-2-chao-garden.png"
      blurb: "The genetics and adorableness and the planning! It's such a small but polished gem in an already great game! There's an active hungry community waiting to see something like this take its place."
    - { title: "Super Mario Sunshine", done: false, console: "GCN" }  # 2002
    - title: "The Legend of Zelda: The Wind Waker"  # 2002
      console: "GCN"
      done: true
      rating: 3.5
      shot: "zelda-wind-waker.png"
      blurb: "Vast world with small compact islands. I'll admit, I used a little speed hack to get from point A to point B sometimes for the long sailing adventure. Still the story and charm puts this with the greats."
    - title: "Custom Robo"  # 2004
      console: "GCN"
      done: true
      rating: 3.5
      shot: "custom-robo.png"
      blurb: "The battles are fun! Lots of expression in the customization and playstyles. Though I ended up cheesing most battles I could with high stun striking vanisher builds."
    - { title: "The Legend of Zelda: The Minish Cap", done: false, console: "GBA" }  # 2004
    - title: "Need for Speed: Most Wanted"  # 2005
      console: "GCN"
      done: true
      rating: 3.5
      shot: "need-for-speed-most-wanted.png"
      blurb: "I'm not much of a racing sim kinda guy, but the story and the cop chases were peak power fantasy. This game dictated my dream sports car."
    - { title: "The Legend of Zelda: Twilight Princess", done: false, console: "GCN" }  # 2006
    - { title: "Old School RuneScape: Max Cape", done: false, console: "PC" }  # 2013
# Books — same checklist + drill-down pattern as games. Covers live in
# assets/achievements/<cover>.<ext> (any raster type; -1, -2 … = extra
# carousel images). rating → stars; status → a progress/state note.
books:
  label: "Books"
  items:
    - title: "The 4-Hour Workweek"
      done: true
      rating: 2.0
      cover: "4-hour-work"
      blurb: "It was inspiring for it's time and the systems or mode-of-thinking is still valuable. Though a lot of the book is explaining how to get that done for it's time, and now with AI you'll have to recontextualize the book for a modern audience."
    - title: "The 7 Habits of Highly Effective People"
      done: true
      rating: 2.0
      cover: "7-effective-habits"
      blurb: "I think this book was a trend setter for self help, though the contents I found to be a bit... obvious? Instead of going into it trying to learn something, it's more of a reminder to give focus to what you already inherently know."
    - title: "12 Rules for Life"
      done: true
      rating: 2.0
      cover: "12-rules-for-life"
      blurb: "Extremely sharp in its use of language, and the memes of lobsters with the genuine insight of serotonin production leading to physiological changes was fun. I think I got more out of his YouTube videos though."
    - title: "The 48 Laws of Power"
      done: true
      rating: 2.5
      cover: "48-power"
      blurb: "I love the format, all the short stories to remember the lesson. Though the lessons I'd rather not have needed court vocabulary to learn. The lessons themselves: best to recognize the game to avoid the people playing it."
    - title: "The Art of the Deal"
      done: false
      cover: "art-of-the-deal"
    - title: "The Chronicles of Narnia"
      done: false
      cover: "chronicles-of-narnia"
      blurb: "You're never too old for a fairytale, and this series feels like grandad is reading you a bedtime story. It's comfort."
      series:
        - { title: "The Lion, the Witch and the Wardrobe", done: true }
        - { title: "Prince Caspian", done: true }
        - { title: "The Voyage of the Dawn Treader", done: true }
        - { title: "The Silver Chair", done: false }
        - { title: "The Horse and His Boy", done: false }
        - { title: "The Magician's Nephew", done: false }
        - { title: "The Last Battle", done: false }
    - title: "The Hobbit"
      done: true
      status: "Needs a re-read"
      cover: "hobbit"
      blurb: "One of my favorite books as a kid, and I even went to the Shire in Matamata NZ. I actually had my first beer, 'Sobering Thought', in the Green Dragon Inn!"
    - title: "The Lord of the Rings"
      done: true
      status: "Needs a re-read"
      cover: "lord-of-the-rings"
      blurb: "I've re-watched this series probably 10-15 times and have gone on the NZ tour. I can do a mean Smeagol impression."
    - title: "Mistborn"
      done: false
      cover: "mistborn"
      series:
        - { title: "The Final Empire", done: false }
        - { title: "The Well of Ascension", done: false }
        - { title: "The Hero of Ages", done: false }
    - title: "Percy Jackson & the Olympians"
      done: false
      cover: "percy-jackson"
      blurb: "This was my book fair guilty pleasure as a kid. Read it with my dad. We both got disappointed in the movie theater."
      series:
        - { title: "The Lightning Thief", done: true }
        - { title: "The Sea of Monsters", done: false }
        - { title: "The Titan's Curse", done: false }
        - { title: "The Battle of the Labyrinth", done: false }
        - { title: "The Last Olympian", done: false }
    - title: "The Republic"
      done: true
      rating: 3.5
      cover: "plato-republic"
      blurb: "This book made me fall in love with philosophy. I've actually wanted to get a huge back piece / shoulder wrap tattoo depicting the tripartite soul. I haven't gone through with it, never was a priority."
    - title: "The Power of Habit"
      done: true
      rating: 3.5
      cover: "power-of-habit"
      blurb: "Breaks down an evergreen concept with studies to back it up. It feels genuinely educational compared to a bunch of self help 'slop' I've gone through. However, I'm not a disciplined powerhouse from reading it. It's no magic bullet."
    - title: "Rich Dad Poor Dad"
      done: true
      rating: 3.0
      cover: "rich-dad"
      blurb: "A solid introduction for how to think about money for those who didn't grow up around it. Writing was easy to follow. It's not all encompassing, and I recommend extending your education after this."
    - title: "The Tide Child Trilogy"
      done: false
      cover: "tide-child-trilogy"
      series:
        - { title: "The Bone Ships", done: false }
        - { title: "Call of the Bone Ships", done: false }
        - { title: "The Bone Ship's Wake", done: false }
    - title: "How to Win Friends & Influence People"
      done: true
      rating: 2.0
      cover: "win-friends-influence-people"
      blurb: "It's good, though I didn't really walk away feeling like there was more I could do that wasn't already done. It just brought attention to things I already knew."
---
