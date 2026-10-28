---
title: "Impossible List"
description: "A living list of what Konrad Wright wants to do in life, the skills he wants to earn and the adventures he wants to take, plus the games he plays and the books he reads — designed to keep growing rather than get finished."
layout: "impossible-list"
updated: 2026-10-28
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Not a bucket list you complete — one you keep adding to. The idea (borrowed from Joel Runyon) is that the list should always outrun you."
groups:
  - label: "Life"
    items:
      - { text: "Graduate High School", done: true }
      - { text: "Hold a Six-Figured Salaried Job", done: true }
      - { text: "Find a life partner", done: true }
      - { text: "Propose", done: false }
      - { text: "Marry", done: false }
      - { text: "Own a Home", done: false }
      - { text: "Have a Kid", done: false }
  - label: "Skills"
    items:
      - { text: "Perform theater for a live audience", done: true }
      - { text: "Win an official tournament (Smash Bros. Melee)", done: true }
      - { text: "Get an accolade in my field", done: false }
      - { text: "Learn an Instrument", done: false }
      - { text: "Build a Tiny Home", done: false }
  - label: "Quests"
    items:
      - { text: "Bungee Jump", done: true }
      - { text: "Sky Dive", done: true }
      - { text: "Zip-Line", done: true }
      - { text: "Cable Fall", done: true }
      - { text: "Canyon Swing", done: false }
      - { text: "Parasailing", done: false }
      - { text: "Shark Tank", done: false }
      - { text: "Marathon", done: false }
# Games — two Netflix-style rows, split by `console`: handhelds (GBC, GBA …)
# on "Handhelds/Mobile", everything else on "Console/PC" (the split lives in
# _default/impossible-list.html). Each row orders itself the way the books do:
# played games by rating (ties: the entry lower in this file wins), then
# unplayed in the order they're written here, most recommended first, so put
# a new game where it ranks. year = release year. cover → box art in
# assets/img/games/covers/<cover>.webp (the shelf); shot → screenshots in
# assets/img/games/<shot> plus -1, -2 … extras (the drawer carousel; a game
# without shots shows its cover there instead). blurb → your review; pitch →
# why the game is worth playing. With both, the drawer shows the review and a
# toggle to the pitch. current: true → what I'm playing right now: first on its
# shelf, outlined, with a "Playing" badge (books take it too, as "Reading").
games:
  label: "Games"
  items:
    - title: "Super Mario 64"
      year: 1996
      console: "N64"
      done: true
      rating: 3.0
      cover: "super-mario-64"
      shot: "super-mario-64.webp"
      pitch: "Mario's leap into 3D wrote the rulebook for moving a character and a camera through open levels, all reached by jumping into the paintings of Peach's castle."
      blurb: "I can see the effect this had on later games, I never beat it as a kid, in fact, I never even got far. But it's beat and was extremely charming!"
    - title: "Diddy Kong Racing"
      year: 1997
      console: "N64"
      done: true
      rating: 2.5
      cover: "diddy-kong-racing-64"
      shot: "diddy-kong-racing-64.webp"
      pitch: "Rare's kart racer with an adventure mode on top: an island hub, boss races, and a car, hovercraft or plane to pick on most tracks."
      blurb: "A nostalgic whimsical trip, but toon racing games have come a long way since then."
    - title: "The Legend of Zelda: Ocarina of Time"
      year: 1998
      console: "N64"
      done: true
      rating: 4.0
      cover: "zelda-ocarina-of-time"
      shot: "zelda-ocarina-of-time.webp"
      pitch: "Link grows from forest kid to Hero of Time across a Hyrule built for 3D, with the lock-on targeting nearly every action game since has borrowed."
      blurb: "This was a defining moment in my childhood, and the exploring of Hyrule feels like a stroll through my favorite park. Felt bigger as a kid, but nothing wrong with a smaller world, things felt intentional."
    - title: "Pokémon Snap"
      year: 1999
      console: "N64"
      done: true
      rating: 2.5
      cover: "pokemon-snap"
      shot: "pokemon-snap.webp"
      pitch: "An on-rails safari where the only tool is a camera: photograph wild Pokémon and Professor Oak grades each shot on pose, size and framing."
      blurb: "Nostalgia Trip on Wheels, all the small things came back to me so the rediscovery which was core to the gameplay was lost on the replay so I didn't get to sit with this game for long."
    - title: "Donkey Kong 64"
      year: 1999
      console: "N64"
      done: true
      rating: 3.0
      cover: "donkey-kong-64"
      shot: "donkey-kong-64.webp"
      pitch: "Rare's sprawling 3D platformer: five playable Kongs, each with their own moves and colour-coded collectibles, across huge themed worlds."
      blurb: "WOW the Collectible Count was INSANE. Still the level design was peak, and DK Island feels like visiting a summer home you used to see as a kid."
    - title: "Kirby 64: The Crystal Shards"
      year: 2000
      console: "N64"
      done: true
      rating: 2.5
      cover: "kirby-crystal-shards"
      shot: "kirby-crystal-shards.webp"
      pitch: "A 2.5D Kirby where any two copy abilities combine into a new one, hunting crystal shards across a storybook-bright world."
      blurb: "I'm not much of a side-scrolling platform guy, but the constant asking 'What does this combination do?' is really fun!"
    - title: "Sonic Adventure 2: Battle (Chao Garden)"
      year: 2002
      console: "GCN"
      done: true
      rating: 3.0
      cover: "sonic-adventure-2-chao-garden"
      shot: "sonic-adventure-2-chao-garden.webp"
      pitch: "Between the hero and dark stories sits the Chao Garden: raise little creatures whose looks and stats change with the animals and fruit you give them, then race them."
      blurb: "The genetics and adorableness and the planning! It's such a small but polished gem in an already great game! There's an active hungry community waiting to see something like this take its place."
    - title: "Super Smash Bros. Melee"
      year: 2001
      console: "GCN"
      done: true
      rating: 5.0
      cover: "super-smash-bros-melee"
      pitch: "Nintendo's all-star fighter, where the goal is to knock rivals off the stage rather than drain a health bar. Fast, deep and still played at tournaments more than twenty years on."
      blurb: "This game was formative to my upbringing. The stories of teenage hijinks, tournaments won, and friends made along the way makes this game more than just a game for me."
    - title: "The Legend of Zelda: The Wind Waker"
      year: 2002
      console: "GCN"
      done: true
      rating: 3.5
      cover: "zelda-wind-waker"
      shot: "zelda-wind-waker.webp"
      pitch: "A cel-shaded Zelda on a drowned Hyrule: sail the Great Sea between islands, conduct the wind with a baton, and fight with some of the series' best animation."
      blurb: "Vast world with small compact islands. I'll admit, I used a little speed hack to get from point A to point B sometimes for the long sailing adventure. Still the story and charm puts this with the greats."
    - title: "Pokémon Sapphire"
      year: 2003
      console: "GBA"
      done: true
      rating: 4.0
      cover: "pokemon-sapphire"
      shot: "pokemon-sapphire.webp"
      pitch: "Hoenn's debut brought abilities, natures and double battles, and a team plot over the seas that wakes Kyogre. The generation modern competitive Pokémon grew from."
      blurb: "My comfort zone for Pokémon games. Straightforward without the extra fluff. Good story, memorable additions, and a solid starter trio."
    - title: "Hamtaro: Ham-Ham Heartbreak"
      year: 2003
      console: "GBA"
      done: true
      rating: 3.5
      cover: "hamtaro-heartbreak"
      shot: "hamtaro-heartbreak.webp"
      pitch: "Hamtaro learns Ham-Chat words and uses them as tools to fix the couples Spat has broken up. Cuter than it looks, and properly puzzly."
      blurb: "Honestly, for how childish it is, this has some of the best puzzles that actually got me to think and get stuck. It's pretty much a point-and-click adventure with some 'keys' that'll have you returning to previously unsolvable puzzles."
    - title: "Custom Robo"
      year: 2004
      console: "GCN"
      done: true
      rating: 3.5
      cover: "custom-robo"
      shot: "custom-robo.webp"
      pitch: "Build a pocket-sized robo from guns, bombs, pods and legs, then fight in compact 3D arenas. A rookie-Commander story wraps a deep loadout game."
      blurb: "The battles are fun! Lots of expression in the customization and playstyles. Though I ended up cheesing most battles I could with high stun striking vanisher builds."
    - title: "The Legend of Zelda: The Minish Cap"
      year: 2004
      console: "GBA"
      done: true
      rating: 4.0
      cover: "zelda-minish-cap"
      shot: "zelda-minish-cap.webp"
      pitch: "A talking cap shrinks Link to the size of the tiny Minish, turning puddles and bookshelves into dungeons. Short, dense and full of charm."
      blurb: "As someone who liked the Oracle series additions, this was a solid approach to how I like to engage with Zelda. Boiled down to its essence, this game nails it."
    - title: "Need for Speed: Most Wanted"
      year: 2005
      console: "GCN"
      done: true
      rating: 3.5
      cover: "need-for-speed-most-wanted"
      shot: "need-for-speed-most-wanted.webp"
      pitch: "Climb Rockport's Blacklist of fifteen street racers while police chases escalate the more heat you earn. The cop pursuits are the star."
      blurb: "I'm not much of a racing sim kinda guy, but the story and the cop chases were peak power fantasy. This game dictated my dream sports car."
    - title: "Pokémon Mystery Dungeon: Red Rescue Team"
      year: 2006
      console: "GBA"
      done: true
      rating: 3.0
      cover: "pokemon-mystery-dungeon-red"
      shot: "pokemon-mystery-dungeon-red.webp"
      pitch: "You wake up as a Pokémon, form a rescue team and dive into randomly built dungeons one turn at a time. A roguelike with a story that hits harder than you'd expect."
      blurb: "More of a nostalgia trip for me. The story is decent, and the gameplay was probably my first foray into tile-based dungeon crawls."
    - title: "The Legend of Zelda: Twilight Princess"
      year: 2006
      console: "GCN"
      done: false
      current: true
      cover: "zelda-twilight-princess"
      pitch: "A darker, older Zelda: Link turns into a wolf in the Twilight Realm with the impish Midna on his back. Big dungeons and one of the series' best companions."
    - title: "Viva Piñata: Trouble in Paradise"
      year: 2008
      console: "XBOX"
      done: true
      rating: 3.5
      cover: "viva-pinata-trouble-in-paradise"
      shot: "viva-pinata-trouble-in-paradise.webp"
      pitch: "Rare's garden sim: shape the land and plant the right things, and living piñatas move in, breed and squabble. The sequel adds desert and arctic trips for rare species."
      blurb: "Not a design pattern I see often — I'll call it attraction-based gameplay. You put effort into something to attract discovery to you. That's an underserved gaming niche, not to mention the aesthetic is charming as can be."
    - title: "The Elder Scrolls V: Skyrim"
      year: 2016
      console: "XSX"
      done: true
      rating: 3.0
      cover: "skyrim"
      shot: "skyrim.webp"
      pitch: "An open world where you can walk toward any mountain and find a story on it. Dragons are back, you are the Dragonborn, and the rest is up to you."
      blurb: "This is a comfort game for me. When I want to just 'take a walk' digitally, this feels like walking around my old neighborhood. Over time some new things are added in, and it's fun to discover things I never saw before. I'm not huge into the modding scene — I appreciate it, but I like having the shared experience."
    - title: "The Legend of Zelda: Oracle of Seasons"
      year: 2001
      console: "GBC"
      done: false
      cover: "zelda-oracle-of-seasons"
      pitch: "The action half of the Oracle pair: Link swings the Rod of Seasons to flip Holodrum between spring, summer, autumn and winter, opening paths each season blocks."
    - title: "The Legend of Zelda: Oracle of Ages"
      year: 2001
      console: "GBC"
      done: false
      cover: "zelda-oracle-of-ages"
      pitch: "Capcom's puzzle-first Zelda: Link plays the Harp of Ages to jump between past and present and reshape Labrynna. Link it to Seasons for the true ending."
    - title: "Golden Sun"
      year: 2001
      console: "GBA"
      done: false
      cover: "golden-sun"
      pitch: "Camelot's Game Boy Advance RPG, where Psynergy spells double as puzzle tools in dungeons and collectable Djinn reshape your party's classes. Continued in The Lost Age."
    - title: "Super Mario Sunshine"
      year: 2002
      console: "GCN"
      done: false
      cover: "super-mario-sunshine"
      pitch: "Mario on holiday on Isle Delfino with FLUDD, a water pack that hovers, rockets and sprays away graffiti goop. Strange, tight, and full of secret levels."
    - title: "Old School RuneScape: Max Cape"
      year: 2013
      console: "PC"
      done: false
      cover: "old-school-runescape"
      pitch: "RuneScape as it was in 2007, kept alive and steered by player votes. The Max Cape goes to players who reach level 99 in every skill: a years-long goal."
# Books — one Netflix-style row per shelf, covers clicking into the same
# drill-down as games. The page orders each row itself: read books by rating
# (ties: the entry lower in this file wins, so append new books at the bottom of
# their shelf), then unread in the order they're written here, most
# recommended first, so put a new book where it ranks. year = first
# publication (negative = BC). Covers live in assets/img/achievements/<cover>.<ext> (any
# raster type; -1, -2 … = extra carousel images). rating → stars; status → a
# note shown instead; series → a progress checklist. A series book's own
# `pitch` shows as the drawer's carousel reaches its cover: with one image per
# book they pair up in order; with one extra image first (a box set), that
# first image keeps the entry's pitch. blurb → your review;
# pitch → why the book is worth reading. With both, the drawer shows the review
# and a toggle to the pitch.
books:
  label: "Books"
  shelves:
    - label: "For Pleasure"
      items:
        - title: "The Hobbit"
          year: 1937
          done: true
          status: "Needs a re-read"
          cover: "hobbit"
          pitch: "Bilbo Baggins is hired as a burglar by thirteen dwarves and a wizard, and comes home changed. Tolkien's warm, funny adventure is the doorway to Middle-earth and still one of the best children's books ever written."
          blurb: "One of my favorite books as a kid, and I even went to the Shire in Matamata NZ. I actually had my first beer, 'Sobering Thought', in the Green Dragon Inn!"
        - title: "The Lord of the Rings"
          year: 1954
          done: true
          status: "Needs a re-read"
          cover: "lord-of-the-rings"
          pitch: "The foundation of modern fantasy: an ordinary hobbit carries the most dangerous object in the world across Middle-earth. Tolkien built whole languages and millennia of history behind it, and you feel that depth on every page."
          blurb: "I've re-watched this series probably 10-15 times and have gone on the NZ tour. I can do a mean Smeagol impression."
        - title: "The Republic"
          year: -375
          done: true
          rating: 3.5
          cover: "plato-republic"
          pitch: "Plato's dialogue on justice that ends up designing an ideal city and a three-part theory of the soul, with the allegory of the cave along the way. Arguably the most influential book in Western philosophy."
          blurb: "This book made me fall in love with philosophy. I've actually wanted to get a huge back piece / shoulder wrap tattoo depicting the tripartite soul. I haven't gone through with it, never was a priority."
        - title: "The Da Vinci Code"
          year: 2003
          done: false
          current: true
          cover: "da-vinci-code"
          pitch: "Short chapters, cliffhanger endings, a murder in the Louvre and a trail of codes through art history. A pure page-turner: take the history with a grain of salt and enjoy the puzzle hunt."
        - title: "The Chronicles of Narnia"
          year: 1950
          done: false
          cover: "chronicles-of-narnia"
          pitch: "Four children step through a wardrobe into a land of talking animals, endless winter and a lion named Aslan. C.S. Lewis's seven short books are warm, full of wonder and easy to fall back into at any age."
          blurb: "You're never too old for a fairytale, and this series feels like grandad is reading you a bedtime story. It's comfort."
          series:
            - title: "The Lion, the Witch and the Wardrobe"
              done: true
              pitch: "Four siblings step through a wardrobe into Narnia, frozen in the White Witch's endless winter, and meet Aslan, the lion who comes to end it."
            - title: "Prince Caspian"
              done: true
              pitch: "The Pevensies are pulled back to Narnia centuries later to help young Prince Caspian win back a kingdom that has forgotten its talking beasts."
            - title: "The Voyage of the Dawn Treader"
              done: true
              pitch: "Edmund, Lucy and their insufferable cousin Eustace sail with King Caspian toward the edge of the world. An island-hopping voyage, and the strangest of the seven."
            - title: "The Silver Chair"
              done: false
              pitch: "Eustace and Jill Pole head into the wild north with Puddleglum, a gloomy Marsh-wiggle, to find a lost prince. The darkest book, with the funniest companion."
            - title: "The Horse and His Boy"
              done: true
              pitch: "A runaway boy and a talking warhorse flee through Calormen toward Narnia and stumble on a plot to invade it. A standalone adventure set during the Pevensies' reign."
            - title: "The Magician's Nephew"
              done: true
              pitch: "The origin story: Digory and Polly wake the witch Jadis in a dead world and watch Aslan sing Narnia into being. It also explains the lamppost."
            - title: "The Last Battle"
              done: false
              pitch: "Narnia's last days: a false Aslan, a betrayed king and a final stand. The series closes on a door into something larger."
        - title: "Dungeon Crawler Carl"
          year: 2020
          done: false
          cover: "dungeon-crawler-carl"
          pitch: "Earth is demolished for an alien game show, and the survivors have to fight their way down a dungeon for ratings. Carl and his cat, Princess Donut, carry a LitRPG that's funnier and darker than it has any right to be."
          series:
            - title: "Dungeon Crawler Carl"
              done: false
            - title: "Carl's Doomsday Scenario"
              done: false
              pitch: "Carl and Princess Donut push deeper into the dungeon, and the alien audience, and the dungeon's own AI, start taking a personal interest in them."
            - title: "The Dungeon Anarchist's Cookbook"
              done: false
              pitch: "Carl's knack for explosives makes him a hero to some viewers and a problem for the people running the show."
            - title: "The Gate of the Feral Gods"
              done: false
              pitch: "The crawl gets political: gods, factions and sponsors outside the dungeon start fighting over what Carl does inside it."
            - title: "The Butcher's Masquerade"
              done: false
              pitch: "Carl and Donut are now stars, and the season starts slipping out of the showrunners' control."
            - title: "The Eye of the Bedlam Bride"
              done: false
              pitch: "The stakes go galactic as the powers watching the show fight over the dungeon's future, with Carl caught in the middle."
            - title: "This Inevitable Ruin"
              done: false
              pitch: "The series' darkest stretch yet: the dungeon throws everything it has at the crawlers, and not everyone makes it through."
            - title: "A Parade of Horribles"
              done: false
              pitch: "Book eight (2026): the crawl goes on, and the game itself is starting to break around Carl and Donut."
        - title: "Mistborn"
          year: 2006
          done: false
          cover: "mistborn"
          pitch: "A heist crew takes on an immortal god-emperor in a world where ash falls from the sky. Sanderson's magic runs on hard rules you can reason about like a game system, the closest a novel gets to theorycrafting a Skyrim build."
          series:
            - title: "The Final Empire"
              done: false
            - title: "The Well of Ascension"
              done: false
              pitch: "Vin and Elend have to hold the city of Luthadel with three armies at its walls, while something new stirs in the mists."
            - title: "The Hero of Ages"
              done: false
              pitch: "Ash falls, the mists spread, and every mystery from the first two books comes due. One of the most satisfying trilogy endings in fantasy."
        - title: "Endurance"
          year: 1959
          done: false
          cover: "endurance"
          pitch: "Shackleton's 1914 expedition: the ship is crushed by Antarctic ice and 28 men spend nearly two years fighting their way home. Every one of them survives. One of the great true adventure stories, built from the crew's own diaries."
        - title: "Meditations"
          year: 180
          done: false
          cover: "meditations"
          pitch: "Private notes the Roman emperor Marcus Aurelius wrote to himself, never meant to be published. The most powerful man in the world reminding himself to be patient, humble and focused on what he controls. Read a page a day."
        - title: "Shoe Dog"
          year: 2016
          done: false
          cover: "shoe-dog"
          pitch: "Phil Knight's memoir of building Nike, from selling imported running shoes out of his car to a global brand, with near-bankruptcy at every turn. Reads like a novel and is one of the most honest startup stories out there."
        - title: "Percy Jackson & the Olympians"
          year: 2005
          done: false
          cover: "percy-jackson"
          pitch: "A kid with ADHD and dyslexia learns he's the son of Poseidon, and the Greek gods turn out to be alive and meddling in modern America. Fast, funny and a sneaky crash course in mythology."
          blurb: "This was my book fair guilty pleasure as a kid. Read it with my dad. We both got disappointed in the movie theater."
          series:
            - title: "The Lightning Thief"
              done: true
              pitch: "Percy Jackson finds out his father is Poseidon, then gets blamed for stealing Zeus's lightning bolt. A road trip across America full of monsters hiding in plain sight."
            - title: "The Sea of Monsters"
              done: false
              pitch: "Camp Half-Blood's protective tree has been poisoned, and the only cure is the Golden Fleece, somewhere in the Sea of Monsters."
            - title: "The Titan's Curse"
              done: false
              pitch: "Annabeth goes missing, the goddess Artemis is captured, and Percy joins her Hunters on a quest west while the Titan Kronos gathers strength."
            - title: "The Battle of the Labyrinth"
              done: false
              pitch: "Kronos's army has found a way into camp through Daedalus's Labyrinth, a maze that rewires itself, and Percy has to reach it first."
            - title: "The Last Olympian"
              done: false
              pitch: "The war comes to Manhattan: Kronos marches on Mount Olympus, and the great prophecy about Percy's sixteenth birthday finally comes due."
        - title: "Letters from a Stoic"
          year: 65
          done: false
          cover: "letters-from-a-stoic"
          pitch: "124 letters from Seneca to a friend on time, fear, wealth, friendship and death. Written by one of the richest men in Rome, so the advice on not being owned by your possessions comes with built-in tension. Read one a night."
        - title: "Horus Rising"
          year: 2006
          done: false
          cover: "horus-rising"
          pitch: "Book one of the Horus Heresy: the Imperium at its height, seen through Captain Garviel Loken, just before the galaxy's greatest betrayal. The best way into Warhammer 40k lore, no painted minis required."
          series:
            - title: "Horus Rising"
              done: false
            - title: "False Gods"
              done: false
              pitch: "Horus is struck down on the moon Davin, and the cure comes from people with their own plans for him. The book where the Warmaster's fall begins."
            - title: "Galaxy in Flames"
              done: false
              pitch: "The betrayal at Isstvan III: Horus moves openly against the Emperor, and the loyalists inside his own Legion have to choose a side."
            - title: "The Flight of the Eisenstein"
              done: false
              pitch: "Death Guard captain Nathaniel Garro sees the treachery up close and takes a frigate to warn Terra: a desperate flight across the warp."
            - title: "Fulgrim"
              done: false
              pitch: "Fulgrim, the Emperor's Children's perfect primarch, chases perfection until an ancient blade starts whispering to him. A tragedy in slow motion."
        - title: "The Tide Child Trilogy"
          year: 2019
          done: false
          cover: "tide-child-trilogy"
          pitch: "Ships built from the bones of extinct sea dragons, crewed by the condemned, and then a living dragon is sighted. Grimdark naval fantasy with some of the most original worldbuilding of the last decade."
          series:
            - title: "The Bone Ships"
              done: false
            - title: "Call of the Bone Ships"
              done: false
              pitch: "Lucky Meas and Joron Twiner keep the black ship Tide Child sailing with a hunted crew, as the sea dragons' return pushes the islands toward war."
            - title: "The Bone Ship's Wake"
              done: false
              pitch: "The trilogy's ending: the war the first two books warned of arrives, and Joron has become a captain the drunk from book one would not recognise."
        - title: "Love and Math"
          year: 2013
          done: false
          cover: "love-and-math"
          pitch: "Edward Frenkel argues math is as beautiful as art, through his own story and the Langlands program, a grand unified theory of mathematics. Part memoir, part invitation; no advanced math needed."
        - title: "A Million Miles in a Thousand Years"
          year: 2009
          done: false
          cover: "million-miles-in-a-thousand-years"
          pitch: "While his life is being turned into a movie, Donald Miller realizes it would make a boring one, and sets out to live a better story. A warm memoir about choosing adventure on purpose."
        - title: "Thus Spoke Zarathustra"
          year: 1883
          done: false
          cover: "thus-spoke-zarathustra"
          pitch: "Nietzsche's philosophical novel: a prophet comes down from the mountain to teach the Übermensch, eternal recurrence and the death of God. Poetic and strange; read it as literature first and philosophy second."
        - title: "Twilight of the Idols"
          year: 1889
          done: false
          cover: "twilight-of-the-idols"
          pitch: "Nietzsche's short, sharp late book, written in about a week: 'how to philosophize with a hammer.' Aphorisms and attacks on Socrates, morality and German culture, and the quickest way into Nietzsche."
    - label: "For Study"
      items:
        - title: "The 4-Hour Workweek"
          year: 2007
          done: true
          rating: 2.0
          cover: "4-hour-work"
          pitch: "Tim Ferriss's playbook for escaping the 9-to-5: cut low-value work, automate income, and take mini-retirements instead of waiting for one big one. It launched the lifestyle-design movement and the idea that your time is the asset."
          blurb: "It was inspiring for it's time and the systems or mode-of-thinking is still valuable. Though a lot of the book is explaining how to get that done for it's time, and now with AI you'll have to recontextualize the book for a modern audience."
        - title: "The 7 Habits of Highly Effective People"
          year: 1989
          done: true
          rating: 2.0
          cover: "7-effective-habits"
          pitch: "Stephen Covey's seven habits, from 'be proactive' to 'sharpen the saw,' building from personal independence to working well with others. Its urgent-versus-important matrix alone has organized millions of to-do lists."
          blurb: "I think this book was a trend setter for self help, though the contents I found to be a bit... obvious? Instead of going into it trying to learn something, it's more of a reminder to give focus to what you already inherently know."
        - title: "12 Rules for Life"
          year: 2018
          done: true
          rating: 2.0
          cover: "12-rules-for-life"
          pitch: "Jordan Peterson's twelve rules, from 'stand up straight with your shoulders back' to 'pet a cat when you encounter one,' blending psychology, mythology and personal story into an argument for taking on responsibility."
          blurb: "Extremely sharp in its use of language, and the memes of lobsters with the genuine insight of serotonin production leading to physiological changes was fun. I think I got more out of his YouTube videos though."
        - title: "The 48 Laws of Power"
          year: 1998
          done: true
          rating: 2.5
          cover: "48-power"
          pitch: "Robert Greene distills 3,000 years of history into 48 laws of power, each told through stories of courtiers, con artists and kings. Read it less as a manual and more as a field guide to the people playing the game."
          blurb: "I love the format, all the short stories to remember the lesson. Though the lessons I'd rather not have needed court vocabulary to learn. The lessons themselves: best to recognize the game to avoid the people playing it."
        - title: "The Power of Habit"
          year: 2012
          done: true
          rating: 3.5
          cover: "power-of-habit"
          pitch: "Charles Duhigg explains the habit loop of cue, routine and reward through research and stories of people, companies and movements. The clearest account of why habits stick, and how to change one by swapping the routine."
          blurb: "Breaks down an evergreen concept with studies to back it up. It feels genuinely educational compared to a bunch of self help 'slop' I've gone through. However, I'm not a disciplined powerhouse from reading it. It's no magic bullet."
        - title: "Rich Dad Poor Dad"
          year: 1997
          done: true
          rating: 3.0
          cover: "rich-dad"
          pitch: "Robert Kiyosaki contrasts the money lessons of his two 'dads': assets put money in your pocket, liabilities take it out, and the rich buy assets. The book that got millions thinking about financial literacy for the first time."
          blurb: "A solid introduction for how to think about money for those who didn't grow up around it. Writing was easy to follow. It's not all encompassing, and I recommend extending your education after this."
        - title: "How to Win Friends & Influence People"
          year: 1936
          done: true
          rating: 2.0
          cover: "win-friends-influence-people"
          pitch: "Dale Carnegie's guide to getting along with people: be genuinely interested in others, remember names, let them talk, and never tell someone they're wrong. Ninety years old and still the base layer of every people-skills book since."
          blurb: "It's good, though I didn't really walk away feeling like there was more I could do that wasn't already done. It just brought attention to things I already knew."
        - title: "Man's Search for Meaning"
          year: 1946
          done: false
          cover: "mans-search-for-meaning"
          pitch: "Viktor Frankl's account of surviving Auschwitz and other camps, and the psychology he built from it: we can't always choose our circumstances, but we can choose our response. Short, harrowing and essential."
        - title: "Thinking, Fast and Slow"
          year: 2011
          done: false
          cover: "thinking-fast-and-slow"
          pitch: "Nobel laureate Daniel Kahneman on the two systems in your head, fast intuition and slow deliberation, and the biases from trusting the wrong one. Some priming studies haven't replicated, but the core is foundational."
        - title: "The Psychology of Money"
          year: 2020
          done: false
          cover: "psychology-of-money"
          pitch: "Morgan Housel's short chapters on how people actually behave with money: luck, risk, compounding and knowing when you have enough. The most readable personal-finance book around, and a calming one."
        - title: "Influence"
          year: 1984
          done: false
          cover: "influence"
          pitch: "Cialdini's classic on the principles of persuasion: reciprocity, commitment, social proof, liking, authority and scarcity (the new edition adds unity). Learn them once and you'll spot them in every sales page and negotiation."
        - title: "Deep Work"
          year: 2016
          done: false
          cover: "deep-work"
          pitch: "Cal Newport's case that focused, distraction-free work is both rare and increasingly valuable. Practical rituals for protecting long blocks of concentration, which matters more with every new chat channel and alert."
        - title: "Mindset"
          year: 2006
          done: false
          cover: "mindset"
          pitch: "Carol Dweck's research on fixed versus growth mindsets: believing ability is set, or that it can be developed, changes how you handle failure and effort. The idea is famous; the book has the nuance the slogans miss."
        - title: "Antifragile"
          year: 2012
          done: false
          cover: "antifragile"
          pitch: "Taleb's big idea: some things don't just survive shocks, they get stronger from them. A sharp lens for systems work. What in your infrastructure, career or business gains from disorder instead of merely tolerating it?"
        - title: "The Almanack of Naval Ravikant"
          year: 2020
          done: false
          cover: "almanack-of-naval-ravikant"
          pitch: "Eric Jorgenson's collection of Naval Ravikant's tweets and talks on wealth and happiness: specific knowledge, leverage, and playing long-term games with long-term people. Short enough for one sitting."
        - title: "$100M Series"
          year: 2021
          done: false
          cover: "100m-series"
          pitch: "Alex Hormozi's three-book playbook for growing a business: make an offer people feel stupid saying no to, get it in front of strangers, then structure what you sell so each customer is worth more."
          series:
            - title: "$100M Offers"
              done: false
              pitch: "Hormozi's case that most businesses don't have a marketing problem, they have an offer problem. His value equation (dream outcome and likelihood of success, over time and effort) is a lens you can put on any product page the same afternoon."
            - title: "$100M Leads"
              done: false
              pitch: "The sequel to Offers: once you have something worth buying, how strangers find out. The core four (warm outreach, content, cold outreach, paid ads) laid out like an operations manual rather than a pep talk."
            - title: "$100M Money Models"
              done: false
              pitch: "The third $100M book is about what comes after the first sale: sequencing offers so a new customer pays for their own acquisition. Most useful once you already sell something and want each customer to be worth more."
        - title: "The Goal"
          year: 1984
          done: false
          cover: "the-goal"
          pitch: "A business novel: a plant manager has 90 days to save his factory and discovers the Theory of Constraints. The Phoenix Project is modeled on it, so for a DevOps engineer this is the source text on bottlenecks and flow."
        - title: "Thinking in Bets"
          year: 2018
          done: false
          cover: "thinking-in-bets"
          pitch: "Former poker pro Annie Duke on deciding under uncertainty: judge decisions by their process, not their outcome, and think in probabilities. A great fit for postmortems, where 'bad outcome' and 'bad call' get confused."
        - title: "Economics in One Lesson"
          year: 1946
          done: false
          cover: "economics-in-one-lesson"
          pitch: "Hazlitt's one lesson: judge a policy by its effects on everyone and over the long run, not just the immediate, visible ones. A short classic on the seen and the unseen that still frames a lot of economic debate."
        - title: "Fooled by Randomness"
          year: 2001
          done: false
          cover: "fooled-by-randomness"
          pitch: "Taleb's first book in the Incerto: how often we mistake luck for skill, especially in markets. A good antidote to survivorship bias when reading success stories, including plenty of the books on this shelf."
        - title: "The War of Art"
          year: 2002
          done: false
          cover: "war-of-art"
          pitch: "Steven Pressfield names the force that stops you from creating, Resistance, and says the cure is to turn pro: show up every day regardless of mood. Short and punchy; read it when a project stalls."
        - title: "Factfulness"
          year: 2018
          done: false
          cover: "factfulness"
          pitch: "Hans Rosling shows the world is in better shape than most people think, then names the 10 instincts that distort our view. Data-driven and warm, and it builds the habit of checking assumptions before reacting to scary headlines."
        - title: "Crucial Conversations"
          year: 2002
          done: false
          cover: "crucial-conversations"
          pitch: "How to talk when stakes are high, opinions differ and emotions run strong. The core idea, keeping a conversation safe enough that people say what they really think, works for code reviews, clients and family alike."
        - title: "The E-Myth Revisited"
          year: 1995
          done: false
          cover: "e-myth-revisited"
          pitch: "Why most small businesses stall: the founder works in the business instead of on it. Gerber's fix is to build it like a franchise prototype with documented systems. Basically runbooks for everything, which a DevOps brain will love."
        - title: "Ultralearning"
          year: 2019
          done: false
          cover: "ultralearning"
          pitch: "Scott Young, who worked through MIT's four-year computer science curriculum in one year from its free materials, breaks aggressive self-directed learning into nine principles. Ideal for picking up a new language or stack fast."
        - title: "A Mind for Numbers"
          year: 2014
          done: false
          cover: "mind-for-numbers"
          pitch: "Barbara Oakley, who flunked high-school math before becoming an engineer, explains how learning actually works: focused versus diffuse thinking, chunking and spaced practice. The book behind the 'Learning How to Learn' course."
        - title: "Peak"
          year: 2016
          done: false
          cover: "peak"
          pitch: "Anders Ericsson, whose research became the '10,000 hours' rule, explains what that rule gets wrong: deliberate practice, not hours, builds expertise. The playbook for getting genuinely good at something."
        - title: "The Great Mental Models"
          year: 2019
          done: false
          cover: "great-mental-models"
          pitch: "Shane Parrish's four-volume toolbox of thinking models borrowed from physics, biology, systems, math, economics and art. Volume 1 alone (first principles, second-order thinking, inversion) changes how you approach problems."
          series:
            - title: "General Thinking Concepts"
              done: false
            - title: "Physics, Chemistry and Biology"
              done: false
              pitch: "Volume 2: models from physics, chemistry and biology, such as inertia, catalysts and natural selection, applied to decisions and organisations."
            - title: "Systems and Mathematics"
              done: false
              pitch: "Volume 3: systems and maths, from feedback loops and bottlenecks to compounding, sampling and regression to the mean."
            - title: "Economics and Art"
              done: false
              pitch: "Volume 4: economics (scarcity, trade-offs, supply and demand) alongside art's lessons on audience, framing and storytelling."
        - title: "The Simple Path to Wealth"
          year: 2016
          done: false
          cover: "simple-path-to-wealth"
          pitch: "JL Collins turned letters to his daughter into a plan: avoid debt, spend less than you earn, buy broad low-cost index funds and leave them alone. The simplest investing book that's still complete."
        - title: "The Most Important Thing"
          year: 2011
          done: false
          cover: "the-most-important-thing"
          pitch: "Howard Marks, cofounder of Oaktree, distills decades of investor memos: second-level thinking, risk, market cycles and contrarianism. Warren Buffett called it 'that rarity, a useful book.'"
        - title: "Outlive"
          year: 2023
          done: false
          cover: "outlive"
          pitch: "Peter Attia's case for preventing chronic disease decades early instead of treating it late: exercise (strength and VO2 max especially), sleep, nutrition and emotional health. A strong push to keep the gym habit."
        - title: "Show Your Work!"
          year: 2014
          done: false
          cover: "show-your-work"
          pitch: "Austin Kleon's 10 ways to share your process so the right people find you. A short, illustrated nudge to publish what you learn as you go, which is exactly what a personal site with a /misc corner is for."
        - title: "Storyworthy"
          year: 2018
          done: false
          cover: "storyworthy"
          pitch: "Matthew Dicks, a 32-time Moth StorySLAM champion, teaches how to find and tell true stories, starting with 'Homework for Life': note one storyworthy moment every day. Makes you better at talks, interviews and dinners."
        - title: "The Dip"
          year: 2007
          done: false
          cover: "the-dip"
          pitch: "Seth Godin's tiny book on quitting: most worthwhile things have a dip, a long hard slog before mastery, and the real skill is telling a dip from a dead end. Ninety minutes that can save years."
        - title: "Grit"
          year: 2016
          done: false
          cover: "grit"
          pitch: "Angela Duckworth's research on why passion plus perseverance often predicts success better than talent. Useful for long projects where motivation fades, and for seeing how interests deepen into a calling."
        - title: "The ONE Thing"
          year: 2013
          done: false
          cover: "the-one-thing"
          pitch: "Gary Keller's focusing question: what's the one thing you can do such that by doing it everything else becomes easier or unnecessary? Simple enough to remember and ask every Monday morning."
        - title: "Traction"
          year: 2007
          done: false
          cover: "traction"
          pitch: "Gino Wickman's Entrepreneurial Operating System (EOS): vision, people, data, issues, process and traction. A complete operating manual for running a small company once it outgrows the founder's head."
        - title: "I Will Teach You to Be Rich"
          year: 2009
          done: false
          cover: "i-will-teach-you-to-be-rich"
          pitch: "Ramit Sethi's six-week program: automate your finances, spend extravagantly on what you love and cut mercilessly on what you don't. Practical right down to scripts for negotiating fees."
        - title: "Attached"
          year: 2010
          done: false
          cover: "attached"
          pitch: "Adult attachment theory made practical: anxious, avoidant and secure styles, and what happens when they collide in a relationship. A quick read that explains a lot of past dating confusion in hindsight."
        - title: "The Charisma Myth"
          year: 2012
          done: false
          cover: "charisma-myth"
          pitch: "Olivia Fox Cabane argues charisma is learnable behavior (presence, power and warmth), not an inborn trait. Concrete exercises for coming across better in interviews, pitches and first meetings."
        - title: "Problem-Solving Strategies"
          year: 1998
          done: false
          cover: "problem-solving-strategies"
          pitch: "Arthur Engel's legendary olympiad training book: invariants, the pigeonhole principle, extremal arguments, induction and more, each with a pile of hard problems. Brutal and rewarding, one chapter at a time."
        - title: "A Concise Introduction to Pure Mathematics"
          year: 2000
          done: false
          cover: "concise-intro-pure-mathematics"
          pitch: "Martin Liebeck's on-ramp from calculating to proving: sets, real numbers, primes, complex numbers and countability, in short chapters with exercises. If puzzles like Sudoku are fun, this is where math starts feeling like that."
        - title: "The 4 Disciplines of Execution"
          year: 2012
          done: false
          cover: "four-disciplines-of-execution"
          pitch: "A system for executing strategy despite the daily whirlwind: focus on the wildly important, act on lead measures, keep a compelling scoreboard, hold a cadence of accountability. Usable for a small team or your own goals."
        - title: "Atlas of the Heart"
          year: 2021
          done: false
          cover: "atlas-of-the-heart"
          pitch: "Brené Brown maps 87 emotions and experiences, with precise language for each. The argument: you can't work through what you can't name. A vocabulary upgrade for relationships and hard conversations."
        - title: "The Four Agreements"
          year: 1997
          done: false
          cover: "four-agreements"
          pitch: "Four rules drawn from Toltec wisdom: be impeccable with your word, don't take anything personally, don't make assumptions, always do your best. A one-evening read that's easy to remember and hard to practice."
        - title: "How to Get Rich"
          year: 2006
          done: false
          cover: "how-to-get-rich"
          pitch: "Felix Dennis, founder of Maxim magazine, on what getting rich actually takes: ownership, persistence and accepting the costs. Blunt, funny and unusually honest about whether being rich is even worth it."
        - title: "The Millionaire Fastlane"
          year: 2011
          done: false
          cover: "millionaire-fastlane"
          pitch: "MJ DeMarco's argument against getting rich slowly through a job and decades of saving: build a business system that scales beyond your hours. Abrasive in places, but it reframes products and leverage well."
        - title: "The Power of Now"
          year: 1997
          done: false
          cover: "power-of-now"
          pitch: "Eckhart Tolle's guide to living in the present instead of in your thinking mind. Spiritual rather than scientific, but the core practice, noticing the voice in your head instead of being it, is close kin to modern mindfulness."
        - title: "As a Man Thinketh"
          year: 1903
          done: false
          cover: "as-a-man-thinketh"
          pitch: "A 1903 essay you can finish in under an hour, arguing that your character and circumstances grow out of your habitual thoughts. Half the modern self-help shelf is a remix of it, so it's worth reading the source."
        - title: "The Productivity Project"
          year: 2016
          done: false
          cover: "productivity-project"
          pitch: "Chris Bailey spent a year testing productivity advice on himself (extreme schedules, isolation, meditation) and reports what actually works. Managing time, attention and energy, tested rather than preached."
        - title: "Ogilvy on Advertising in the Digital Age"
          year: 2017
          done: false
          cover: "ogilvy-on-advertising-digital-age"
          pitch: "Miles Young updates David Ogilvy's 1983 classic for search, social and data. Useful for anyone selling online: what changed, and which Ogilvy principles (research, clarity, respect for the reader) never did."
        - title: "How to Not Die Alone"
          year: 2021
          done: false
          cover: "how-to-not-die-alone"
          pitch: "Logan Ury, who led relationship research at Hinge, brings behavioral science to modern dating: the three dating tendencies, why the 'spark' is overrated, and how to actually decide. Practical and surprisingly kind."
        - title: "The Alter Ego Effect"
          year: 2019
          done: false
          cover: "alter-ego-effect"
          pitch: "Performance coach Todd Herman's method: build a deliberate alter ego for the arenas where you freeze, like sales calls, the gym or a hard conversation. Sounds gimmicky; it's a structured look at why personas like Kobe's 'Black Mamba' work."
        - title: "Tax-Free Wealth"
          year: 2012
          done: false
          cover: "tax-free-wealth"
          pitch: "Tom Wheelwright, Robert Kiyosaki's CPA, argues the US tax code is a set of incentives you can line up with through business and real estate. A natural follow-up to Rich Dad Poor Dad; check specifics with your own CPA."
        - title: "What Every Real Estate Investor Needs to Know About Cash Flow"
          year: 2004
          done: false
          cover: "real-estate-cash-flow"
          pitch: "Frank Gallinelli's reference for the numbers behind rental property: cash flow, cap rate, NOI, cash-on-cash return and 33 more measures. The math to run before buying anything with a tenant in it."
        - title: "Go for No!"
          year: 2007
          done: false
          cover: "go-for-no"
          pitch: "A short sales fable with one idea: set goals for how many times you hear no, not yes. It turns rejection into a metric and makes outreach feel like a game instead of a verdict."
        - title: "Master Your Emotions"
          year: 2018
          done: false
          cover: "master-your-emotions"
          pitch: "Thibaut Meurisse's practical guide to how emotions form and how to loosen the grip of negative ones. Short and exercise-driven, and this edition is the hands-on workbook."
        - title: "The 21 Irrefutable Laws of Leadership"
          year: 1998
          done: false
          cover: "21-laws-of-leadership"
          pitch: "John Maxwell's 21 laws, from the Law of the Lid (your leadership ability caps your effectiveness) to the Law of Legacy. Each is short and story-driven, so it's a book to dip in and out of."
        - title: "Critical Thinking, Logic & Problem Solving"
          year: 2023
          done: false
          cover: "critical-thinking-logic-problem-solving"
          pitch: "A 4-in-1 beginner's toolkit: spotting logical fallacies, structured problem solving and better decisions. Not a deep text, but a fast refresher on reasoning tools you use every day in planning and incident reviews."
        - title: "Sovereignty"
          year: 2018
          done: false
          cover: "sovereignty"
          pitch: "Ryan Michler, founder of Order of Man, on men taking ownership of their lives: responsibility, discipline, and leading at home and in their community. Direct and demanding, in the same vein as Wild at Heart."
        - title: "The Life-Changing Magic of Tidying Up"
          year: 2011
          done: false
          cover: "life-changing-magic-of-tidying-up"
          pitch: "Marie Kondo's KonMari method: tidy by category, all at once, and keep only what sparks joy. Ruthless about stuff in a way that tends to spill over into calendars and commitments too."
        - title: "The Life-Changing Manga of Tidying Up"
          year: 2017
          done: false
          cover: "life-changing-manga-of-tidying-up"
          pitch: "Marie Kondo's method told as a graphic novel: a young woman in Tokyo learns to keep only what sparks joy. The fastest way to get the KonMari idea, and a fun companion to the original book."
        - title: "Wild at Heart"
          year: 2001
          done: false
          cover: "wild-at-heart"
          pitch: "John Eldredge's Christian book on masculinity: that men are made for a battle to fight, an adventure to live and a beauty to rescue. Heartfelt and opinionated, and a classic in its genre."
        - title: "The Art of the Deal"
          year: 1987
          done: false
          cover: "art-of-the-deal"
          pitch: "Whatever you think of the author, it's a firsthand account of 1980s New York dealmaking: leverage, hype and being willing to walk away. Read it as a negotiation case study and decide for yourself which tactics are worth keeping."
        - title: "Oil Trading Manual"
          year: 1995
          done: false
          cover: "oil-trading-manual"
          pitch: "The industry reference on how physical and paper oil actually trade: contracts, pricing, futures, hedging and risk. Dense, but it explains a market that quietly sets the price of nearly everything else."
---
