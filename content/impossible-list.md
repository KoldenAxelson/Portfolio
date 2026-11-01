---
title: "Impossible List"
description: "A living list of what Konrad Wright wants to do in life, the skills he wants to earn and the adventures he wants to take, plus the games he plays, the books he reads and the movies and shows he watches — designed to keep growing rather than get finished."
layout: "impossible-list"
updated: 2026-11-01
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
      - { text: "Publish a book", done: false }
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
# toggle to the pitch. goals → achievements I'm still chasing in a game I've
# played, a checklist in the drawer: - { text: "…", done: false }.
# current: true → what I'm playing right now: first on its
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
    - title: "Melvor Idle"
      year: 2021
      console: "MOBILE"
      done: true
      rating: 3.5
      cover: "melvor-idle"
      shot: "melvor-idle.webp"
      pitch: "RuneScape boiled down to its skill grind: train woodcutting, fishing, combat and twenty-odd other skills from menus while the game keeps playing when you're away. Three expansions stretch it well past the base game."
      blurb: "As a RuneScape nerd, this game was a blast! I did time-skip the heck out of it though! Patience with idle games wasn't a skill I had then."
    - title: "Rumble Club"
      year: 2024
      console: "MOBILE"
      done: true
      rating: 3.5
      cover: "rumble-club"
      shot: "rumble-club.webp"
      pitch: "A free physics brawler for up to 20 players: grab, punch and fling wobbly characters off the arena across game modes that rotate daily. Climb the all-time trophy leaderboard by winning rounds."
      blurb: "This was a fun game that I got on the ground floor of its release to play. It sorta consumed my life for a while there and I had to drop it to be a good adult."
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
    - title: "Old School RuneScape"
      year: 2013
      console: "PC"
      done: true
      rating: 5.0
      cover: "old-school-runescape"
      pitch: "RuneScape as it was in 2007, kept alive and steered by player votes. Train skills, quest across Gielinor and take on bosses, in a world that still feels shared."
      blurb: "This game shaped who I am in a major part. I learned coding through some unconventional means with this game back when I was 7. It introduced me to my habit of problem solving with technology. On top of that, the memories and hours sunk into this game brings it a special place in my heart."
      goals:
        - { text: "Get a Max Cape", done: false }
        - { text: "Get a TzKal Slayer Helmet", done: false }
        - { text: "Get a Bloodhound Pet", done: false }
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
# and a toggle to the pitch. classic: true → the classic mark on the cover, for
# the foundational Greek, Roman and medieval books in the sense of
# /misc/writing/classical-inspiration/ (impossible-list/cover-card.html).
# A series started but not finished gets the more-to-go chip (an ellipsis in
# the cover's corner) on its own; more: true adds it to any entry.
# Ancient years are traditional, approximate dates.
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
        - title: "Nineteen Eighty-Four"
          year: 1949
          done: false
          cover: "nineteen-eighty-four"
          pitch: "Winston Smith rewrites history at the Ministry of Truth for a Party that watches everyone, all the time. Orwell's novel gave us Big Brother, doublethink and thoughtcrime."
        - title: "Brave New World"
          year: 1932
          done: false
          cover: "brave-new-world"
          pitch: "A future where people are grown in hatcheries, kept content with a drug called soma and never left alone with their thoughts. The other great dystopia, where control comes through comfort instead of fear."
        - title: "Fahrenheit 451"
          year: 1953
          done: false
          cover: "fahrenheit-451"
          pitch: "A fireman whose job is burning books starts secretly reading them. Bradbury's short novel about a society that drifted away from books on its own, long before the censors arrived."
        - title: "Endurance"
          year: 1959
          done: false
          cover: "endurance"
          pitch: "Shackleton's 1914 expedition: the ship is crushed by Antarctic ice and 28 men spend nearly two years fighting their way home. Every one of them survives. One of the great true adventure stories, built from the crew's own diaries."
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
        - title: "No Prey, No Pay"
          year: 2020
          done: false
          cover: "no-prey-no-pay"
          pitch: "A self-published pirate novel about a hunt for ancient treasure, set around the 1692 earthquake that sank much of Port Royal, the Caribbean's most notorious pirate haven."
        - title: "Crime and Punishment"
          year: 1866
          done: false
          cover: "crime-and-punishment"
          pitch: "A broke former student in St. Petersburg kills a pawnbroker to prove he's above ordinary morality, then comes apart under guilt and a patient detective. Dostoevsky's most readable big novel."
        - title: "Notes from Underground"
          year: 1864
          done: false
          cover: "notes-from-underground"
          pitch: "A bitter, nameless former clerk rants against reason, progress and himself from his St. Petersburg \"underground\", then tells the humiliating stories behind it. Short, and often called the first existentialist novel."
        - title: "The Egyptian"
          year: 1945
          done: false
          cover: "egyptian"
          pitch: "Sinuhe, a physician at the court of the heretic pharaoh Akhenaten, tells the story of his life across Egypt and the ancient Near East. Mika Waltari's historical novel was an international bestseller after the war."
        - title: "The Gulag Archipelago"
          year: 1973
          done: false
          cover: "gulag-archipelago"
          pitch: "Solzhenitsyn's history of the Soviet labor camp system, built from his own eight years as a prisoner and the testimony of hundreds of others. Smuggled out and published in the West, it got him expelled from the USSR."
        - title: "Walden"
          year: 1854
          done: false
          cover: "walden"
          pitch: "Thoreau spent two years in a cabin he built himself at Walden Pond and wrote about living simply and on purpose. Part nature writing, part case against trading your life for things you don't need."
        - title: "War and Peace"
          year: 1869
          done: false
          cover: "war-and-peace"
          pitch: "Five aristocratic Russian families through Napoleon's invasion, from ballrooms to the battlefield at Borodino. Long, and Tolstoy makes nearly every one of its hundreds of characters feel like a real person."
        - title: "Infinite Jest"
          year: 1996
          done: false
          cover: "infinite-jest"
          pitch: "A tennis academy, a halfway house and a film so entertaining that anyone who watches it loses the will to do anything else. More than a thousand pages, hundreds of endnotes, and a book about addiction and our appetite for fun."
        - title: "The Glass Bead Game"
          year: 1943
          done: false
          cover: "glass-bead-game"
          pitch: "Hesse's last novel follows Joseph Knecht's rise to Magister Ludi, master of a game that plays with all of human knowledge, in a future order of scholars. Hesse won the Nobel Prize three years after it came out."
        - title: "Leaves of Grass"
          year: 1855
          done: false
          cover: "leaves-of-grass"
          pitch: "Whitman's one book of poems, which he kept expanding from 1855 until his death. Long, loose lines celebrating ordinary American life, with \"Song of Myself\" at the center."
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
        - title: "The Myth of Sisyphus"
          year: 1942
          done: false
          cover: "myth-of-sisyphus"
          pitch: "Camus asks whether life is worth living if it has no meaning, and answers with Sisyphus, condemned to push his boulder forever, whom we must imagine happy. A short, clear way into existentialism."
        - title: "Either/Or"
          year: 1843
          done: false
          cover: "either-or"
          pitch: "Kierkegaard's first big book, published under pseudonyms: the papers of a pleasure-chasing aesthete set against letters from a judge arguing for a committed, ethical life. He leaves the choice to you."
        - title: "Sun and Steel"
          year: 1968
          done: false
          cover: "sun-and-steel"
          pitch: "Yukio Mishima's short essay on how bodybuilding and martial arts changed the way he related to words and to his own body. Strange and intense, published two years before his death."
        - title: "Gravity and Grace"
          year: 1947
          done: false
          cover: "gravity-and-grace"
          pitch: "Simone Weil's notebooks, gathered after her death into short passages on suffering, attention and God. Best read a few pages at a time."
        - title: "Flatline Constructs"
          year: 2018
          done: false
          cover: "flatline-constructs"
          pitch: "Mark Fisher's 1999 PhD thesis, published in 2018: a dense theory of how fiction like Neuromancer and Crash blurs the line between human and machine. Hard going, from the writer who later wrote Capitalist Realism."
        - title: "Millions of Little Threads"
          year: 2023
          done: false
          cover: "millions-of-little-threads"
          pitch: "A lonely young finance worker gets a brain-computer implant, it starts malfunctioning, and the customer support maze only makes things worse. A short, dark and funny novella from Robert Pantano, the voice behind Pursuit of Wonder."
        - title: "Wild at Heart"
          year: 2001
          done: false
          cover: "wild-at-heart"
          pitch: "John Eldredge's Christian book on masculinity: that men are made for a battle to fight, an adventure to live and a beauty to rescue. Heartfelt and opinionated, and a classic in its genre."
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
        - title: "Atomic Habits"
          year: 2018
          done: false
          cover: "atomic-habits"
          pitch: "James Clear on building good habits from tiny changes: make them obvious, attractive, easy and satisfying, and make bad ones the opposite. The most practical habit book around, and a natural follow-up to The Power of Habit."
        - title: "Can't Hurt Me"
          year: 2018
          done: false
          cover: "cant-hurt-me"
          pitch: "David Goggins went from an abused, overweight kid to Navy SEAL and ultramarathoner, and lays out the mental tactics he credits for it, like the \"cookie jar\" and the 40% rule."
        - title: "The Obstacle Is the Way"
          year: 2014
          done: false
          cover: "obstacle-is-the-way"
          pitch: "Ryan Holiday turns Stoic philosophy into a playbook for treating setbacks as material to work with, with stories from Marcus Aurelius to John D. Rockefeller."
        - title: "The Subtle Art of Not Giving a F*ck"
          year: 2016
          done: false
          cover: "subtle-art"
          pitch: "Mark Manson argues that a good life comes from choosing what's worth caring about and accepting the struggle that comes with it, instead of chasing constant positivity."
        - title: "Mere Christianity"
          year: 1952
          done: false
          cover: "mere-christianity"
          pitch: "C.S. Lewis's wartime radio talks on what nearly all Christians believe, starting from the moral law everyone seems to know. One of the most widely read introductions to Christianity."
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
        - title: "Think and Grow Rich"
          year: 1937
          done: false
          cover: "think-and-grow-rich"
          pitch: "Napoleon Hill's steps to success, which he said came from interviewing rich men like Andrew Carnegie: burning desire, faith, persistence and a \"mastermind\" group. One of the best-selling self-help books ever, though historians doubt many of his interview claims."
        - title: "Never Split the Difference"
          year: 2016
          done: false
          cover: "never-split-the-difference"
          pitch: "Former FBI hostage negotiator Chris Voss on negotiating with tactical empathy: mirroring, labeling emotions and getting the other side to say \"that's right.\" Written for salary talks and car deals as much as hostage standoffs."
        - title: "Getting to Yes"
          year: 1981
          done: false
          cover: "getting-to-yes"
          pitch: "The Harvard Negotiation Project's method: separate the people from the problem, focus on interests instead of positions and agree on objective criteria. The cooperative counterpart to Never Split the Difference."
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
        - title: "Flow"
          year: 1990
          done: false
          cover: "flow"
          pitch: "Psychologist Mihaly Csikszentmihalyi on the state of total absorption where time disappears, and how to build more of it into work and life. The research behind every \"get in the zone\" tip."
        - title: "The Slight Edge"
          year: 2005
          done: false
          cover: "slight-edge"
          pitch: "Jeff Olson's argument that small daily choices, easy to do and just as easy to skip, compound over the years into success or failure."
        - title: "Antifragile"
          year: 2012
          done: false
          cover: "antifragile"
          pitch: "Taleb's big idea: some things don't just survive shocks, they get stronger from them. A sharp lens for systems work. What in your infrastructure, career or business gains from disorder instead of merely tolerating it?"
        - title: "Mastery"
          year: 2012
          done: false
          cover: "mastery"
          pitch: "Robert Greene studies masters from Leonardo da Vinci to Darwin and maps the path they shared: a long apprenticeship, then a creative breakthrough."
        - title: "The Laws of Human Nature"
          year: 2018
          done: false
          cover: "laws-of-human-nature"
          pitch: "Robert Greene's long field guide to why people act the way they do, from envy and grandiosity to the roles we play, with a historical figure to illustrate each law."
        - title: "The Art of Seduction"
          year: 2001
          done: false
          cover: "art-of-seduction"
          pitch: "Robert Greene catalogs seducer types and the stages of seduction, drawn from figures like Cleopatra and Casanova. Useful for spotting manipulation as well as practicing charm."
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
        - title: "Zero to One"
          year: 2014
          done: false
          cover: "zero-to-one"
          pitch: "Peter Thiel's Stanford lectures on startups: the companies worth building create something new and end up as monopolies, instead of fighting over an existing market. Short and contrarian."
        - title: "The Lean Startup"
          year: 2011
          done: false
          cover: "lean-startup"
          pitch: "Eric Ries's method for building a company as a series of experiments: ship a minimum viable product, measure what customers actually do and change course fast."
        - title: "Good to Great"
          year: 2001
          done: false
          cover: "good-to-great"
          pitch: "Jim Collins's team studied companies that went from average to beating the market for fifteen years and looked for what they had in common: humble leaders, the right people first and one simple focus."
        - title: "Blue Ocean Strategy"
          year: 2005
          done: false
          cover: "blue-ocean-strategy"
          pitch: "Kim and Mauborgne argue for creating a market no one is competing in, instead of fighting rivals over the same customers. The case studies run from Cirque du Soleil to Yellow Tail wine."
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
        - title: "The Art of War"
          year: -500
          done: false
          cover: "art-of-war"
          pitch: "Thirteen short chapters on strategy from ancient China: know yourself and your enemy, and win without fighting when you can. Read today by executives as much as generals."
        - title: "Bushido"
          year: 1900
          done: false
          cover: "bushido"
          pitch: "Inazo Nitobe wrote this in English to explain the samurai code to Western readers: rectitude, courage, benevolence, politeness, honesty, honor and loyalty. It shaped how the West pictures the samurai."
        - title: "Tao Te Ching"
          year: -400
          done: false
          cover: "tao-te-ching"
          pitch: "Eighty-one short verses attributed to Laozi on the Tao, the way things naturally flow, and on leading without forcing. One of the most translated books in the world."
        - title: "Economics in One Lesson"
          year: 1946
          done: false
          cover: "economics-in-one-lesson"
          pitch: "Hazlitt's one lesson: judge a policy by its effects on everyone and over the long run, not just the immediate, visible ones. A short classic on the seen and the unseen that still frames a lot of economic debate."
        - title: "The Road to Serfdom"
          year: 1944
          done: false
          cover: "road-to-serfdom"
          pitch: "Friedrich Hayek's warning, written in wartime Britain, that central economic planning leads toward tyranny. A founding text of free-market economics."
        - title: "Modern Money Mechanics"
          year: 1961
          done: false
          cover: "modern-money-mechanics"
          pitch: "A booklet the Federal Reserve Bank of Chicago put out to explain how banks create money when they make loans. Short, dry and straight from the source."
        - title: "The Creature from Jekyll Island"
          year: 1994
          done: false
          cover: "creature-from-jekyll-island"
          pitch: "G. Edward Griffin's account of the secret 1910 meeting on Jekyll Island where bankers drafted the plan for the Federal Reserve, and his case that the Fed works as a banking cartel. The meeting really happened; economists reject much of his reading of it, so pair it with Modern Money Mechanics."
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
        - title: "The Mass Psychology of Fascism"
          year: 1933
          done: false
          cover: "mass-psychology-of-fascism"
          pitch: "Wilhelm Reich, a former student of Freud, tries to explain why ordinary Germans backed fascism against their own interests, pinning it on sexual repression and the authoritarian family. Banned by the Nazis; decades later the US government burned his books over his unrelated orgone claims."
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
        - title: "The $100 Startup"
          year: 2012
          done: false
          cover: "hundred-dollar-startup"
          pitch: "Chris Guillebeau collected the stories of people who started businesses for around $100 and grew them into a living. A practical guide to small, one-person businesses."
        - title: "The 1-Page Marketing Plan"
          year: 2015
          done: false
          cover: "one-page-marketing-plan"
          pitch: "Allan Dib fits a small business's entire marketing plan onto a nine-square grid: before, during and after someone becomes a customer."
        - title: "DotCom Secrets"
          year: 2015
          done: false
          cover: "dotcom-secrets"
          pitch: "ClickFunnels co-founder Russell Brunson's trilogy on selling online: build a sales funnel, become an expert people trust, then fill the funnel with traffic."
          series:
            - title: "DotCom Secrets"
              done: false
            - title: "Expert Secrets"
              done: false
              pitch: "How to turn what you know into a following that will pay for your advice: tell your origin story, build a movement and pitch without sounding like a salesman."
            - title: "Traffic Secrets"
              done: false
              pitch: "Where your dream customers already gather online, and how to get them into your funnel, platform by platform."
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
        - title: "The Long and the Short of It"
          year: 2009
          done: false
          cover: "long-and-short-of-it"
          pitch: "Economist John Kay's guide to investing for smart people outside the finance industry: how markets work, what fees cost you and how to manage your own portfolio sensibly."
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
        - title: "Medical Nemesis"
          year: 1975
          done: false
          cover: "medical-nemesis"
          pitch: "Ivan Illich argues that past a certain point, modern medicine causes as much harm as it cures, from side effects to people losing the ability to cope with pain and death on their own terms. Later reissued as Limits to Medicine."
        - title: "The Anxious Generation"
          year: 2024
          done: false
          cover: "anxious-generation"
          pitch: "Jonathan Haidt argues that the move from play-based to phone-based childhood in the early 2010s drove a rise in teen anxiety and depression, and proposes four norms to reverse it. Some researchers dispute how strong the evidence is."
        - title: "Dopamine Nation"
          year: 2021
          done: false
          cover: "dopamine-nation"
          pitch: "Stanford psychiatrist Anna Lembke on how easy access to endless pleasures, from phones to food, throws the brain's reward system out of balance, and how stepping away resets it."
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
        - title: "The SaaS Playbook"
          year: 2023
          done: false
          cover: "saas-playbook"
          pitch: "Rob Walling, co-founder of MicroConf and TinySeed, on building a software company without venture capital: picking a niche, pricing, marketing and keeping customers."
        - title: "Start Small, Stay Small"
          year: 2010
          done: false
          cover: "start-small-stay-small"
          pitch: "Rob Walling's guide for developers launching a small software product on their own: find the niche first, test demand before coding and market before launch. Some of the tools have aged, the approach hasn't."
        - title: "Start Marketing the Day You Start Coding"
          done: false
          cover: "start-marketing"
          pitch: "A collection of Rob Walling's essays on running a small software business, from marketing before you build to why free plans don't work."
        - title: "The Entrepreneur's Guide to Keeping Your Sh*t Together"
          year: 2018
          done: false
          cover: "keeping-your-sht-together"
          pitch: "Psychologist Sherry Walling on the mental side of running a company: stress, isolation, burnout and relationships. Written with her husband, Rob Walling."
        - title: "I Will Teach You to Be Rich"
          year: 2009
          done: false
          cover: "i-will-teach-you-to-be-rich"
          pitch: "Ramit Sethi's six-week program: automate your finances, spend extravagantly on what you love and cut mercilessly on what you don't. Practical right down to scripts for negotiating fees."
        - title: "Millionaire Mission"
          year: 2024
          done: false
          cover: "millionaire-mission"
          pitch: "Brian Preston of The Money Guy Show lays out his nine-step Financial Order of Operations, a ranked answer to what you should do with your next dollar."
        - title: "Rich AF"
          year: 2023
          done: false
          cover: "rich-af"
          pitch: "Vivian Tu, a former Wall Street trader known online as Your Rich BFF, covers budgeting, debt, investing and negotiating pay in plain, funny language for people who never learned money at home."
        - title: "Attached"
          year: 2010
          done: false
          cover: "attached"
          pitch: "Adult attachment theory made practical: anxious, avoidant and secure styles, and what happens when they collide in a relationship. A quick read that explains a lot of past dating confusion in hindsight."
        - title: "Models"
          year: 2011
          done: false
          cover: "models"
          pitch: "Mark Manson's dating book built on honesty: attraction comes from being invested in your own life and open about what you want, and pickup tricks get in the way."
        - title: "The Way of the Superior Man"
          year: 1997
          done: false
          cover: "way-of-the-superior-man"
          pitch: "David Deida's short, blunt chapters on masculine purpose, relationships and sexuality. Polarizing, and widely read in men's groups."
        - title: "All About Love"
          year: 2000
          done: false
          cover: "all-about-love"
          pitch: "bell hooks argues that love is something you do, made of care, respect, trust and commitment, and that a culture without a clear definition of it keeps confusing love with desire or control."
        - title: "Man and His Symbols"
          year: 1964
          done: false
          cover: "man-and-his-symbols"
          pitch: "The one book Carl Jung wrote for general readers, finished just before he died: dreams, archetypes and the unconscious, with hundreds of illustrations."
        - title: "Sex, Ecology, Spirituality"
          year: 1995
          done: false
          cover: "sex-ecology-spirituality"
          pitch: "Ken Wilber's huge attempt to fit science, philosophy and religion into one map, and the book where he first laid out his four quadrants: the inner and outer sides of individuals and of groups."
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
        - title: "The Nature of Code"
          year: 2012
          done: false
          cover: "nature-of-code"
          pitch: "Daniel Shiffman teaches you to simulate the natural world in code: forces, particles, flocking, cellular automata, evolution and neural networks. Free to read online, with runnable JavaScript examples."
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
        - title: "The Book of Shadow Work"
          year: 2025
          done: false
          cover: "book-of-shadow-work"
          pitch: "Keila Shaheen, author of the viral Shadow Work Journal, expands on Jung's idea of the shadow: finding and accepting the parts of yourself you hide, with interviews from practitioners and her own story."
        - title: "The Four Agreements"
          year: 1997
          done: false
          cover: "four-agreements"
          pitch: "Four rules drawn from Toltec wisdom: be impeccable with your word, don't take anything personally, don't make assumptions, always do your best. A one-evening read that's easy to remember and hard to practice."
        - title: "How to Stop Worrying and Start Living"
          year: 1948
          done: false
          cover: "stop-worrying"
          pitch: "Dale Carnegie's companion to How to Win Friends: concrete habits for cutting down worry, like living in \"day-tight compartments\" and facing the worst case head on."
        - title: "Awaken the Giant Within"
          year: 1991
          done: false
          cover: "awaken-the-giant-within"
          pitch: "Tony Robbins on taking control of your emotions, habits, money and relationships through the decisions you make and the questions you ask yourself."
        - title: "The 5 Second Rule"
          year: 2017
          done: false
          cover: "five-second-rule"
          pitch: "Mel Robbins's one trick: count 5-4-3-2-1 and move before your brain talks you out of it, plus the stories and research she builds around it."
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
        - title: "Main Street Millionaire"
          year: 2024
          done: false
          cover: "main-street-millionaire"
          pitch: "Codie Sanchez makes the case for buying boring, profitable small businesses like laundromats and plumbing companies instead of starting from scratch, and walks through finding, financing and running them."
        - title: "Million Dollar Weekend"
          year: 2024
          done: false
          cover: "million-dollar-weekend"
          pitch: "Noah Kagan, an early Facebook employee and the founder of AppSumo, on getting past the fear of starting: find a problem, pre-sell a fix and test the business idea in a weekend."
        - title: "12 Months to $1 Million"
          year: 2020
          done: false
          cover: "twelve-months-to-a-million"
          pitch: "Ryan Daniel Moran's plan for building an e-commerce brand to a million dollars in sales within a year: pick a product, serve one specific customer and expand from there."
        - title: "Entrepreneur Revolution"
          year: 2013
          done: false
          cover: "entrepreneur-revolution"
          pitch: "Daniel Priestley on breaking out of an industrial-age job mindset and building a small business around what you do best."
        - title: "The Power of Now"
          year: 1997
          done: false
          cover: "power-of-now"
          pitch: "Eckhart Tolle's guide to living in the present instead of in your thinking mind. Spiritual rather than scientific, but the core practice, noticing the voice in your head instead of being it, is close kin to modern mindfulness."
        - title: "Reality Transurfing"
          year: 2004
          done: false
          cover: "reality-transurfing"
          pitch: "Vadim Zeland, a former Russian physicist, claims reality is a field of possible versions and you slide between them by managing intention and letting go of \"importance\". Esoteric self-help, closer to The Power of Now than to physics."
        - title: "A New Earth"
          year: 2005
          done: false
          cover: "new-earth"
          pitch: "Eckhart Tolle's follow-up to The Power of Now, on how the ego drives our suffering and what changes when you start noticing it. Oprah's book club turned it into a phenomenon."
        - title: "The Secret"
          year: 2006
          done: false
          cover: "the-secret"
          pitch: "Rhonda Byrne's bestseller on the \"law of attraction\": think about what you want with enough conviction and the universe delivers it. A cultural phenomenon with no scientific backing."
        - title: "As a Man Thinketh"
          year: 1903
          done: false
          cover: "as-a-man-thinketh"
          pitch: "A 1903 essay you can finish in under an hour, arguing that your character and circumstances grow out of your habitual thoughts. Half the modern self-help shelf is a remix of it, so it's worth reading the source."
        - title: "The Science of Being Well"
          year: 1910
          done: false
          cover: "science-of-being-well"
          pitch: "Wallace D. Wattles, author of The Science of Getting Rich, applies New Thought ideas to health: right thinking, eating, breathing and sleep. Read it as a period piece, not as medical advice."
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
        - title: "The Greatest Salesman in the World"
          year: 1968
          done: false
          cover: "greatest-salesman"
          pitch: "A short parable about a camel boy in the ancient world who becomes the greatest salesman alive by living out ten scrolls of wisdom. You're meant to read each scroll every day for a month."
        - title: "The Book on High Ticket Sales"
          year: 2023
          done: false
          cover: "high-ticket-sales"
          pitch: "Chad Aleo's guide to remote closing, selling expensive offers over the phone, from landing the job to handling objections. A short, practical sales manual."
        - title: "Master Your Emotions"
          year: 2018
          done: false
          cover: "master-your-emotions"
          pitch: "Thibaut Meurisse's practical guide to how emotions form and how to loosen the grip of negative ones. Short and exercise-driven, and this edition is the hands-on workbook."
        - title: "Emotional Intelligence"
          year: 1995
          done: false
          cover: "emotional-intelligence"
          pitch: "Daniel Goleman's bestseller that made EQ a household term, arguing that self-awareness, self-control and empathy can matter more than IQ."
        - title: "Shift"
          year: 2025
          done: false
          cover: "shift"
          pitch: "Psychologist Ethan Kross on tools for managing your emotions so they don't manage you, from changing your surroundings to the way you talk to yourself. The follow-up to Chatter."
        - title: "The Six Pillars of Self-Esteem"
          year: 1994
          done: false
          cover: "six-pillars-of-self-esteem"
          pitch: "Nathaniel Branden treats self-esteem as something you build through six practices, among them living consciously, self-responsibility and personal integrity."
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
        - title: "The Sovereign Individual"
          year: 1997
          done: false
          cover: "sovereign-individual"
          pitch: "Davidson and Rees-Mogg predicted in 1997 that the internet and digital money would weaken nation-states and let individuals choose where to be taxed and governed. Tech founders love it for how much came true; it's worth arguing with where it didn't."
        - title: "The Federalist Papers"
          year: 1788
          done: false
          cover: "federalist-papers"
          pitch: "Eighty-five essays by Alexander Hamilton, James Madison and John Jay arguing for ratifying the US Constitution. Courts still cite them for what the framers intended."
        - title: "The Conservative Mind"
          year: 1953
          done: false
          cover: "conservative-mind"
          pitch: "Russell Kirk traces conservative thought from Edmund Burke to T.S. Eliot. The book that gave postwar American conservatism its intellectual history."
        - title: "A History of the English-Speaking Peoples"
          year: 1956
          done: false
          cover: "english-speaking-peoples"
          pitch: "Winston Churchill's four-volume history of Britain and its former colonies, from Caesar's invasion to the end of the Victorian era, published a few years after he won the Nobel Prize in Literature."
          series:
            - title: "The Birth of Britain"
              done: false
            - title: "The New World"
              done: false
              pitch: "From the Tudors through the English Civil War to the Glorious Revolution of 1688."
            - title: "The Age of Revolution"
              done: false
              pitch: "From 1688 to the defeat of Napoleon, with the American Revolution along the way."
            - title: "The Great Democracies"
              done: false
              pitch: "From 1815 to 1901: Victorian Britain, the American Civil War and the spread of the empire."
        - title: "The Death of the West"
          year: 2002
          done: false
          cover: "death-of-the-west"
          pitch: "Pat Buchanan, former Nixon and Reagan adviser and presidential candidate, argues that falling birth rates, mass immigration and cultural change threaten the survival of Western nations."
        - title: "Right Wing Revolution"
          year: 2024
          done: false
          cover: "right-wing-revolution"
          pitch: "Turning Point USA founder Charlie Kirk lays out how he wanted conservatives to push back against what he called woke ideology in schools, business and culture."
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
        - title: "The Republic"
          year: -375
          classic: true
          done: true
          rating: 3.5
          cover: "plato-republic"
          pitch: "Plato's dialogue on justice that ends up designing an ideal city and a three-part theory of the soul, with the allegory of the cave along the way. Arguably the most influential book in Western philosophy."
          blurb: "This book made me fall in love with philosophy. I've actually wanted to get a huge back piece / shoulder wrap tattoo depicting the tripartite soul. I haven't gone through with it, never was a priority."
        - title: "Meditations"
          year: 180
          classic: true
          done: false
          cover: "meditations"
          pitch: "Private notes the Roman emperor Marcus Aurelius wrote to himself, never meant to be published. The most powerful man in the world reminding himself to be patient, humble and focused on what he controls. Read a page a day."
        - title: "Letters on Ethics"
          year: 65
          classic: true
          done: false
          cover: "letters-on-ethics"
          pitch: "124 letters from Seneca to a friend on time, fear, wealth, friendship and death. Written by one of the richest men in Rome, so the advice on not being owned by your possessions comes with built-in tension. Read one a night."
        - title: "On the Shortness of Life"
          year: 49
          classic: true
          done: false
          cover: "shortness-of-life"
          pitch: "Seneca's essay arguing that life is long enough, and we waste most of it on busyness and on other people's demands. Short, and it reads like it was written about the modern calendar."
        - title: "The Odyssey"
          year: -725
          classic: true
          done: false
          cover: "odyssey"
          pitch: "Odysseus takes ten years to get home from Troy: monsters, gods, shipwrecks and a house full of suitors waiting at the end. Homer's poem is the oldest road-trip story in the West and still one of the best."
        - title: "The Iliad"
          year: -750
          classic: true
          done: false
          cover: "iliad"
          pitch: "A few weeks in the tenth year of the Trojan War, set off by Achilles' rage at his own king. Homer at his most brutal and most human, about what war costs the men who fight it."
        - title: "The Aeneid"
          year: -19
          classic: true
          done: false
          cover: "aeneid"
          pitch: "Virgil's answer to Homer: a Trojan survivor carries his people across the sea to found what becomes Rome, giving up what he wants for what he owes."
        - title: "Anabasis"
          year: -370
          classic: true
          done: false
          cover: "anabasis"
          pitch: "Xenophon's own account of ten thousand Greek soldiers stranded deep in Persia after their employer dies, electing their own leaders and marching home. A war memoir that reads like an adventure."
        - title: "Aesop's Fables"
          year: -550
          classic: true
          done: false
          cover: "aesops-fables"
          pitch: "The tortoise and the hare, the fox and the grapes, the boy who cried wolf: hundreds of tiny animal stories with a moral each, the template for every fable since."
        - title: "The Divine Comedy"
          year: 1320
          classic: true
          done: false
          cover: "divine-comedy"
          pitch: "Dante walks down through Hell, up the mountain of Purgatory and into Heaven, meeting the dead and judging them as he goes. The great poem of the Middle Ages."
        - title: "Theogony and Works and Days"
          year: -700
          classic: true
          done: false
          cover: "theogony"
          pitch: "Hesiod's two short poems: how the gods were born and fought their way to Zeus, then a farmer's hard-won advice to his lazy brother on work, seasons and justice. The Greek myths at their source."
        - title: "The Oresteia"
          year: -458
          classic: true
          done: false
          cover: "oresteia"
          pitch: "Aeschylus' only surviving trilogy: a king murdered by his wife, a son's revenge, and the Furies hunting him until Athens invents the jury trial to end the cycle of blood."
        - title: "The Oedipus Plays"
          year: -429
          classic: true
          done: false
          cover: "oedipus"
          pitch: "Sophocles' three Theban plays: the king who hunts a murderer and finds himself, his last days as a blind wanderer, and his daughter Antigone choosing her conscience over the state."
        - title: "Medea"
          year: -431
          classic: true
          done: false
          cover: "medea"
          pitch: "Euripides' revenge tragedy: an outsider wife abandoned by Jason for a princess takes the most terrible revenge there is. Short, savage, and still argued over."
        - title: "The Clouds"
          year: -423
          classic: true
          done: false
          cover: "clouds"
          pitch: "Aristophanes roasts Socrates as a con man running a think-tank in a basket. The funniest play to survive from Athens, staged while Socrates was still alive to watch it."
        - title: "The Histories"
          year: -430
          classic: true
          done: false
          cover: "histories"
          pitch: "Herodotus, the first historian, on how the Greeks beat the Persian Empire, with every wild story he collected along the way: gold-digging ants, Egyptian kings and the stand at Thermopylae."
        - title: "History of the Peloponnesian War"
          year: -400
          classic: true
          done: false
          cover: "peloponnesian-war"
          pitch: "Thucydides watched Athens and Sparta destroy each other over 27 years and wrote it down with a cold eye: plague, propaganda and a democracy talking itself into ruin."
        - title: "The Trial and Death of Socrates"
          year: -399
          classic: true
          done: false
          cover: "apology"
          pitch: "Plato's four short dialogues on the last days of Socrates: charged, defending himself in court, refusing to escape, and drinking the hemlock. The best way into Plato."
        - title: "Nicomachean Ethics"
          year: -340
          classic: true
          done: false
          cover: "nicomachean-ethics"
          pitch: "Aristotle on what a good life actually is: character built by habit, courage as the middle between cowardice and recklessness, and friendship as part of happiness."
        - title: "Poetics"
          year: -335
          classic: true
          done: false
          cover: "poetics"
          pitch: "Aristotle's short handbook on tragedy and the oldest book on how stories work: plot, reversal, recognition and catharsis. Every writing guide since is a footnote to it."
        - title: "Argonautica"
          year: -250
          classic: true
          done: false
          cover: "argonautica"
          pitch: "Apollonius' epic of Jason and the Argonauts sailing for the Golden Fleece, and of Medea, the princess who falls for him and makes the quest possible."
        - title: "Parallel Lives"
          year: 100
          classic: true
          done: false
          cover: "plutarch-lives"
          pitch: "Plutarch pairs famous Greeks and Romans (Alexander and Caesar, Demosthenes and Cicero) to ask what character does to a life. Shakespeare raided it for his Roman plays."
        - title: "Enchiridion"
          year: 125
          classic: true
          done: false
          cover: "enchiridion"
          pitch: "The Stoic handbook, taken down from the lectures of Epictetus, a former slave: sort what you control from what you don't, and stop suffering over the second kind. Pocket-sized."
        - title: "On Duties"
          year: -44
          classic: true
          done: false
          cover: "on-duties"
          pitch: "Cicero's last book, written to his son as the Republic collapsed: what we owe each other, and why doing the right thing and the useful thing are never really in conflict."
        - title: "The Gallic War"
          year: -50
          classic: true
          done: false
          cover: "gallic-war"
          pitch: "Julius Caesar's own account of conquering Gaul, written in the third person and in plain prose, partly as propaganda for the people back in Rome."
        - title: "On the Nature of Things"
          year: -55
          classic: true
          done: false
          cover: "nature-of-things"
          pitch: "Lucretius' long poem explaining Epicurus: a universe of atoms and empty space, no angry gods, and therefore nothing to fear in death."
        - title: "Metamorphoses"
          year: 8
          classic: true
          done: false
          cover: "metamorphoses"
          pitch: "Ovid's fifteen books of transformations, from the creation of the world to Julius Caesar becoming a star: Narcissus, Daedalus, Pygmalion and the rest. The great storehouse of myth."
        - title: "The History of Rome"
          year: -27
          classic: true
          done: false
          cover: "livy-history"
          pitch: "Livy's history of Rome from its founding: Romulus and Remus, the rape of Lucretia, Horatius at the bridge and Hannibal crossing the Alps. Where Rome's stories about itself come from."
        - title: "The Annals"
          year: 116
          classic: true
          done: false
          cover: "annals"
          pitch: "Tacitus on the emperors after Augustus (Tiberius, Claudius and Nero), and on a Senate that learned to flatter its way through tyranny."
        - title: "Lives of the Caesars"
          year: 121
          classic: true
          done: false
          cover: "lives-of-the-caesars"
          pitch: "Suetonius' gossipy biographies of the first twelve emperors, from Julius Caesar to Domitian: their habits, their vices and the omens before their deaths."
        - title: "Odes"
          year: -23
          classic: true
          done: false
          cover: "odes"
          pitch: "Horace's short lyric poems on wine, friendship, love and getting older, where carpe diem comes from. Written by the son of a freed slave who became Augustus' poet."
        - title: "Satires"
          year: 100
          classic: true
          done: false
          cover: "satires"
          pitch: "Juvenal's furious poems against Rome's corruption, the source of 'bread and circuses' and 'who will guard the guards?' Required reading for Grunt Force."
        - title: "The Didache"
          year: 100
          classic: true
          done: false
          cover: "didache"
          pitch: "A short early Christian manual, probably from the late first century, on morals, baptism, fasting and the Eucharist. It was lost for centuries until a copy turned up in 1873."
        - title: "The Epistles of Ignatius"
          year: 110
          classic: true
          done: false
          cover: "ignatius-epistles"
          pitch: "Seven letters Ignatius, bishop of Antioch, wrote while being taken to Rome for execution. Some of the earliest Christian writing on bishops, the Eucharist and church unity."
        - title: "Against Heresies"
          year: 180
          classic: true
          done: false
          cover: "against-heresies"
          pitch: "Irenaeus of Lyon's five-book refutation of the Gnostics, and an early defense of apostolic succession and the four Gospels."
        - title: "Tertullian: Selected Works"
          year: 200
          classic: true
          done: false
          cover: "tertullian"
          pitch: "Tertullian of Carthage, the first major Christian writer in Latin, was sharp and often sarcastic, and the first to use the word Trinity in Latin. His defenses of the faith and writings on Christian life."
        - title: "The Church History"
          year: 325
          classic: true
          done: false
          cover: "church-history-eusebius"
          pitch: "Eusebius of Caesarea's history of Christianity from the apostles to Constantine, and the main source for much of what we know about its first three centuries."
        - title: "On Genesis Against the Manichees"
          year: 389
          classic: true
          done: false
          cover: "against-the-manichees"
          pitch: "Augustine's early commentary on Genesis, written against the Manichaean sect he had belonged to before his conversion."
        - title: "Confessions"
          year: 400
          classic: true
          done: false
          cover: "confessions"
          pitch: "Augustine's account of his restless youth and his conversion, written as a prayer. The first real autobiography, and the bridge from the ancient world to the medieval one."
        - title: "The Consolation of Philosophy"
          year: 524
          classic: true
          done: false
          cover: "consolation"
          pitch: "Written in a cell while Boethius waited to be executed: Lady Philosophy visits and argues him out of despair. One of the most-read books of the Middle Ages."
        - title: "Beowulf"
          year: 1000
          classic: true
          done: false
          cover: "beowulf"
          pitch: "The Old English epic of a hero who kills the monster Grendel, then Grendel's mother, and in old age a dragon. Seamus Heaney's translation reads like it was written yesterday."
        - title: "The Song of Roland"
          year: 1100
          classic: true
          done: false
          cover: "song-of-roland"
          pitch: "The oldest major work of French literature: Charlemagne's rear guard ambushed in the Pyrenees, and Roland too proud to blow his horn for help until it's too late."
        - title: "Summa Theologica"
          year: 1274
          classic: true
          done: false
          cover: "summa-theologica"
          pitch: "Thomas Aquinas's unfinished masterwork: thousands of questions on God, ethics and human nature, each answered only after laying out the strongest objections. The backbone of Catholic theology."
        - title: "The Canterbury Tales"
          year: 1400
          classic: true
          done: false
          cover: "canterbury-tales"
          pitch: "Chaucer's pilgrims tell stories on the road to Canterbury: knights, millers, a nun and the Wife of Bath. Bawdy, funny and the start of English literature."
        - title: "Dark Night of the Soul"
          year: 1585
          done: false
          cover: "dark-night-of-the-soul"
          pitch: "St. John of the Cross, a 16th-century Spanish mystic, on the stretch of faith when God seems absent, and why he believed that darkness purifies the soul. The source of the phrase."
        - title: "Tyndale's New Testament"
          year: 1526
          done: false
          cover: "tyndale-bible"
          pitch: "William Tyndale's 1526 New Testament, the first printed in English and translated straight from the Greek. He was executed for heresy in 1536, and much of his wording lives on in the King James Version."
        - title: "The Bondage of the Will"
          year: 1525
          done: false
          cover: "bondage-of-the-will"
          pitch: "Martin Luther's reply to Erasmus, arguing that the human will is enslaved to sin and salvation depends entirely on God. Luther counted it among his best work."
        - title: "Institutes of the Christian Religion"
          year: 1536
          done: false
          cover: "institutes-christian-religion"
          pitch: "John Calvin's systematic theology, which he kept expanding until 1559, and the foundation of Reformed Protestantism. Book IV covers the church and the sacraments."
        - title: "Orthodoxy"
          year: 1908
          done: false
          cover: "orthodoxy"
          pitch: "G.K. Chesterton's account of how he arrived at Christianity while trying to think his way past it. Witty and packed with paradoxes."
        - title: "I Don't Have Enough Faith to Be an Atheist"
          year: 2004
          done: false
          cover: "enough-faith-atheist"
          pitch: "Norman Geisler and Frank Turek build a step-by-step case, from the existence of truth and God to the reliability of the New Testament."
        - title: "The Book That Made Your World"
          year: 2011
          done: false
          cover: "book-that-made-your-world"
          pitch: "Indian scholar Vishal Mangalwadi argues that the Bible shaped the West's ideas about human dignity, science, universities and freedom."
        - title: "Doctrine"
          year: 2010
          done: false
          cover: "doctrine-driscoll"
          pitch: "Mark Driscoll and Gerry Breshears walk through the core Christian doctrines, from the Trinity and creation to the church and the end times."
        - title: "Scripture Alone"
          year: 2004
          done: false
          cover: "scripture-alone"
          pitch: "James White's defense of sola scriptura, the Protestant teaching that the Bible is the only infallible authority for Christians."
        - title: "Roman Catholics and Evangelicals"
          year: 1995
          done: false
          cover: "roman-catholics-and-evangelicals"
          pitch: "Norman Geisler and Ralph MacKenzie compare Catholic and evangelical theology point by point, setting out where the two agree and where they still differ."
        - title: "What It Means to Be Protestant"
          year: 2024
          done: false
          cover: "what-it-means-protestant"
          pitch: "Gavin Ortlund, a pastor and historian, makes the case for Protestantism to people drawn toward Catholicism and Orthodoxy, arguing the Reformation recovered the early church rather than breaking from it."
        - title: "The Case for Catholicism"
          year: 2017
          done: false
          cover: "case-for-catholicism"
          pitch: "Trent Horn answers classic and modern Protestant objections to Catholic teaching, from the papacy and Mary to purgatory and justification."
        - title: "Why We're Catholic"
          year: 2017
          done: false
          cover: "why-were-catholic"
          pitch: "Trent Horn's plain case for the Catholic faith, from the existence of God and the Resurrection to the Church itself, for skeptics and for Catholics who struggle to explain what they believe."
        - title: "Hard Sayings"
          year: 2016
          done: false
          cover: "hard-sayings"
          pitch: "Trent Horn takes a Catholic approach to the Bible's hardest passages, from apparent contradictions to the violence in the Old Testament."
        - title: "Salvation Is from the Catholic Church"
          year: 2025
          done: false
          cover: "salvation-catholic-church"
          pitch: "Trent Horn argues that Christ saves through the Church he founded, so faith in Jesus and the Church's sacraments belong together."
        - title: "Confusion in the Kingdom"
          year: 2024
          done: false
          cover: "confusion-in-the-kingdom"
          pitch: "Trent Horn looks at the factions of \"progressive\" Catholicism and argues they depart from Catholic teaching on doctrine and morals."
        - title: "Persuasive Pro-Life"
          year: 2014
          done: false
          cover: "persuasive-pro-life"
          pitch: "Trent Horn's guide to talking about abortion in everyday conversation: how to make the pro-life case calmly and answer the common counterarguments."
        - title: "Made This Way"
          year: 2018
          done: false
          cover: "made-this-way"
          pitch: "Leila Miller and Trent Horn help Catholic parents explain the Church's teaching on marriage, sexuality and other moral questions to their kids."
        - title: "Can a Catholic Be a Socialist?"
          year: 2020
          done: false
          cover: "catholic-socialist"
          pitch: "Trent Horn and economist Catherine Pakaluk explain why the Catholic Church has rejected socialism, and what its teaching says instead about property, markets and the poor."
        - title: "Stop, in the Name of God"
          year: 2025
          done: false
          cover: "stop-in-the-name-of-god"
          pitch: "Charlie Kirk's last book, finished weeks before his death and published that December, on how keeping a weekly Sabbath changed his life and why he urged others to do the same."
        - title: "The Adam and Eve Story"
          year: 1963
          done: false
          cover: "adam-and-eve-story"
          pitch: "Chan Thomas argues that Earth's crust periodically slips and wipes out civilization, and that flood myths remember the last time. The CIA released a copy it had kept classified, which gave it a cult following; geologists don't accept the theory."
# Films — three Netflix-style rows, Movies, Shows and Anime, drawn and ordered just like
# the books (impossible-list/cover-card.html): watched ones by rating, then the
# rest in the order written here, most recommended first. kind (movie or show)
# picks the wording and the poster folder: assets/img/movies/<cover>.webp or
# assets/img/shows/<cover>.webp. A shelf sets it for its entries; an entry can
# override it (the anime films on the Anime shelf). year = release (first air date for a show).
# series → a film franchise, or a show with a sequel series, in release order:
# the cover is the first part's poster and <cover>-1, -2 … are the later parts,
# so each part's pitch follows its poster in the drawer (the first part shows
# the entry's pitch). rating, status, blurb and current: true ("Watching"
# badge) work as they do on books. A series started but not finished gets the
# more-to-go chip on its own; more: true adds it to any entry (a show I've
# reviewed but haven't kept up with).
films:
  label: "Films"
  shelves:
    - label: "Movies"
      kind: "movie"
      items:
        - title: "Star Wars"
          year: 1977
          done: true
          rating: 4.0
          cover: "star-wars"
          pitch: "The Skywalker saga: nine films across three trilogies, all about one family. The original trilogy is the must-see, and the prequels were our childhood, memes and all."
          blurb: "This was a nostalgia watch and formative for my childhood, my dog's namesake was Luke Skywalker. I had the lightsabers as a kid playing with my brother. The latter third of this collection was trash, but that doesn't spoil what it once was for me."
          series:
            - title: "A New Hope"
              done: true
            - title: "The Empire Strikes Back"
              done: true
              pitch: "The Empire chases the rebels from the ice planet Hoth to Cloud City, Luke trains with Yoda, and it ends on the most famous twist in movies."
            - title: "Return of the Jedi"
              done: true
              pitch: "Han is rescued from Jabba, the rebels attack a second Death Star, and Luke faces Vader and the Emperor. Ewoks included."
            - title: "The Phantom Menace"
              done: true
              pitch: "Decades before A New Hope, two Jedi find a slave boy named Anakin Skywalker on Tatooine. Podracing, Darth Maul and Duel of the Fates."
            - title: "Attack of the Clones"
              done: true
              pitch: "Ten years later, Anakin guards Senator Padmé Amidala while Obi-Wan uncovers a secret clone army, and the Clone Wars begin."
            - title: "Revenge of the Sith"
              done: true
              pitch: "Anakin falls to the dark side and becomes Darth Vader as the Republic turns into the Empire. The best of the prequels."
            - title: "The Force Awakens"
              done: true
              pitch: "Thirty years after Return of the Jedi, a scavenger named Rey and a runaway stormtrooper named Finn fall in with Han Solo and Chewbacca."
            - title: "The Last Jedi"
              done: true
              pitch: "Rey finds Luke Skywalker hiding on a remote island while the Resistance runs from the First Order. The most argued-about film in the saga."
            - title: "The Rise of Skywalker"
              done: true
              pitch: "Somehow the Emperor is back, and Rey, Finn and Poe race to find him before his fleet launches. The end of the Skywalker saga."
        - title: "Harry Potter"
          year: 2001
          done: true
          rating: 3.0
          cover: "harry-potter"
          pitch: "Eight films following Harry from his first letter to the last stand against Voldemort, with the same young cast growing up on screen over a decade. If you were born in the 90s, each one came out right around the age Harry was in it."
          blurb: "I technically have watched them all in a movie marathon that I fell asleep for a few movies through, so it needs an actual watch. Growing up Seventh Day Adventist, I wasn't really allowed to watch this, but seeing the first movie a few times, I think it's good."
          series:
            - title: "The Sorcerer's Stone"
              done: true
            - title: "The Chamber of Secrets"
              done: false
              pitch: "Something is petrifying students, and the writing on the wall says the Chamber of Secrets has been opened. Harry's second year, with a basilisk and a flying car."
            - title: "The Prisoner of Azkaban"
              done: false
              pitch: "A convicted murderer escapes Azkaban, apparently to find Harry. Alfonso Cuarón took over as director, and the series gets darker and better looking from here."
            - title: "The Goblet of Fire"
              done: false
              pitch: "Someone enters Harry into the deadly Triwizard Tournament, and the final task ends with Voldemort back in a body."
            - title: "The Order of the Phoenix"
              done: false
              pitch: "The Ministry won't admit Voldemort is back and sends Dolores Umbridge to take over Hogwarts, so Harry starts teaching his friends to fight in secret."
            - title: "The Half-Blood Prince"
              done: false
              pitch: "Dumbledore walks Harry through old memories of Voldemort's past to find the secret of his immortality, while Draco Malfoy works on a mission of his own."
            - title: "The Deathly Hallows – Part 1"
              done: false
              pitch: "No Hogwarts this time. Harry, Ron and Hermione are on the run, hunting Horcruxes across Britain while Voldemort takes over the Ministry."
            - title: "The Deathly Hallows – Part 2"
              done: false
              pitch: "The Battle of Hogwarts and the final duel. It was the highest-grossing film of 2011."
        - title: "The Lord of the Rings"
          year: 2001
          done: true
          rating: 5.0
          cover: "lord-of-the-rings"
          pitch: "Peter Jackson shot all three films back to back in New Zealand, and every fantasy adaptation since gets measured against them. Watch the extended editions if you have the weekend."
          blurb: "This is peak fantasy for me. It's a masterpiece and you don't need me to tell you that. However, I had my very first beer called Sobering Thought in the Green Dragon Inn. That's the 1% beer they drank on the actual set!"
          series:
            - title: "The Fellowship of the Ring"
              done: true
            - title: "The Two Towers"
              done: true
              pitch: "The Fellowship splits up. Frodo and Sam follow Gollum toward Mordor, while Aragorn's company ends up defending Helm's Deep against an army of Uruk-hai."
            - title: "The Return of the King"
              done: true
              pitch: "The war comes to Minas Tirith while Frodo and Sam make the last climb up Mount Doom. It won all eleven Oscars it was nominated for."
        - title: "Toy Story"
          year: 1995
          done: true
          rating: 2.0
          cover: "toy-story"
          pitch: "The first fully computer-animated feature film. Woody and Buzz grew up alongside us, and Toy Story 3, where Andy leaves for college, wrecked a generation of teenagers."
          blurb: "The first one was good, the other ones weren't so memorable to me. I remember playing I think an old N64 game based on Toy Story that was fun."
          series:
            - title: "Toy Story"
              done: true
            - title: "Toy Story 2"
              done: true
              pitch: "A toy collector steals Woody, who learns he's a valuable collectible, while Buzz leads a rescue across town."
            - title: "Toy Story 3"
              done: true
              pitch: "Andy is leaving for college, and the toys end up donated to a daycare run by a strawberry-scented bear. Bring tissues."
            - title: "Toy Story 4"
              done: false
              pitch: "Bonnie makes a toy out of a spork named Forky, and a road trip reunites Woody with Bo Peep."
            - title: "Toy Story 5"
              done: false
              pitch: "The toys face a new kind of rival: a tablet called Lilypad that Bonnie can't put down."
        - title: "Jurassic Park"
          year: 1993
          done: true
          rating: 2.5
          cover: "jurassic-park"
          pitch: "A billionaire clones dinosaurs for a theme park, and the power goes out during the preview tour. Spielberg's mix of animatronics and early CGI still looks better than plenty of films made since."
          blurb: "Honestly, the memories I have from the melody alone made this movie worth it for me. And the MEMES, that \"life.. uh.. finds a way\" have made plenty of memorable moments for me."
        - title: "Back to the Future"
          year: 1985
          done: true
          rating: 3.0
          cover: "back-to-the-future"
          pitch: "Marty McFly takes Doc Brown's DeLorean back to 1955 and accidentally gets between his parents before they fall in love. Almost every setup in the first act pays off by the end."
          blurb: "Classic trilogy I used to watch with my family every now and again. Shame we don't have widely used hoverboards in the year 2026 irl."
          series:
            - title: "Back to the Future"
              done: true
            - title: "Back to the Future Part II"
              done: true
              pitch: "Doc takes Marty to 2015 to fix his future kids' problems, and a stolen sports almanac rewrites 1985. Hoverboards and self-lacing shoes."
            - title: "Back to the Future Part III"
              done: true
              pitch: "Marty goes back to 1885 to save Doc from being shot in the Old West. A western, with a steam train pushing the DeLorean to 88 mph."
        - title: "The Lion King"
          year: 1994
          done: true
          rating: 3.0
          cover: "lion-king"
          pitch: "Hamlet with lions: a young prince runs away after his uncle kills his father, and has to come home to take back the throne. Elton John's songs and Hans Zimmer's score, from the peak of Disney's 90s run."
          blurb: "It's great. The musical score is probably the most memorable out of all Disney films. I can play \"In the Jungle\" on the Ocarina."
        - title: "Titanic"
          year: 1997
          done: false
          cover: "titanic"
          pitch: "A rich girl and a poor artist fall in love on the Titanic's maiden voyage. Eleven Oscars, and the highest-grossing film ever until James Cameron beat it himself with Avatar."
        - title: "The Godfather"
          year: 1972
          done: false
          cover: "godfather"
          pitch: "The Corleone crime family, and the youngest son who never wanted any part of it. The first two are regularly named among the best films ever made."
          series:
            - title: "The Godfather"
              done: false
            - title: "The Godfather Part II"
              done: false
              pitch: "Michael's reign as don, cut together with his father's rise in 1920s New York, with Robert De Niro as the young Vito. The first sequel to win Best Picture."
            - title: "The Godfather Part III"
              done: false
              pitch: "An older Michael tries to make the family legitimate through the Vatican. The weakest of the three, but it closes the story."
        - title: "The Matrix"
          year: 1999
          done: true
          rating: 2.0
          cover: "matrix"
          pitch: "A hacker named Neo learns the world is a simulation run by machines, and that he might be the one to end it. Bullet time and kung fu wrapped around a question about reality people still argue over."
          blurb: "I think this is one of those movies where the premise carries it more than the substance. The writing wasn't bad, it in fact had great moments with the pills/spoon/dodging. I just wasn't hooked enough to care to watch the sequels."
          series:
            - title: "The Matrix"
              done: true
            - title: "The Matrix Reloaded"
              done: false
              pitch: "Neo, Trinity and Morpheus try to save Zion from a machine army, and Neo meets the Architect who built the Matrix. The freeway chase is the highlight."
            - title: "The Matrix Revolutions"
              done: false
              pitch: "The machines reach Zion, and Neo travels to the machine city to make a deal."
            - title: "The Matrix Resurrections"
              done: false
              pitch: "Twenty years later, Neo is a game designer who doesn't remember being Neo. Lana Wachowski's sequel is half reunion and half joke about sequels."
        - title: "The Dark Knight Trilogy"
          year: 2005
          done: true
          rating: 3.0
          cover: "dark-knight-trilogy"
          pitch: "Christopher Nolan's Batman, played straight as a crime saga. Heath Ledger's Joker won a posthumous Oscar and is still the villain every comic book movie gets compared to."
          blurb: "Who doesn't love a good Batman film, and Heath Ledger's Joker is by FAR my favorite. Maybe I need to give it a re-watch to score it higher."
          series:
            - title: "Batman Begins"
              done: true
            - title: "The Dark Knight"
              done: true
              pitch: "The Joker arrives in Gotham with no plan and no limits, and pushes Batman, Commissioner Gordon and Harvey Dent to breaking point."
            - title: "The Dark Knight Rises"
              done: true
              pitch: "Eight years later, Bane takes Gotham hostage and a broken Bruce Wayne has to come back as Batman."
        - title: "Shrek"
          year: 2001
          done: true
          rating: 3.0
          cover: "shrek"
          pitch: "An ogre goes on a quest to rescue a princess so he can get his swamp back. It made fun of every Disney fairytale and won the first Oscar for Best Animated Feature."
          blurb: "Great moments, super meme-able. Has a couple of my favorite songs such as All Star, Hallelujah, Believer, Boots are made for Walking, Living la Vida Loca. Though, Farquaad did nothing wrong and ran a good kingdom by mostly any metric that's relevant. Shrek is a villain painted to be a hero if you divorce your feelings from the plot."
          series:
            - title: "Shrek"
              done: true
            - title: "Shrek 2"
              done: true
              pitch: "Shrek meets Fiona's parents in Far Far Away, along with Puss in Boots and a Fairy Godmother with plans of her own. Plenty of people think it beats the first."
            - title: "Shrek the Third"
              done: true
              pitch: "Shrek has to track down the next heir to the throne, a teenage Arthur, before he's stuck being king."
            - title: "Shrek Forever After"
              done: false
              pitch: "A deal with Rumpelstiltskin drops Shrek into a world where he was never born."
        - title: "The Avengers"
          year: 2012
          done: true
          rating: 2.5
          cover: "avengers"
          pitch: "Marvel spent four years of solo films building up to one team-up. These four Avengers films are the spine of the Infinity Saga, and the solo movies fill in the gaps."
          blurb: "It's Action Slop. It's fun to see the fun effects. However with a cast this big and the movies making a cinematic universe, it's a little exhausting to keep track of. Mile wide and inch deep."
          series:
            - title: "The Avengers"
              done: true
            - title: "Age of Ultron"
              done: true
              pitch: "Tony Stark builds an AI to protect the world, and it decides humans are the threat."
            - title: "Infinity War"
              done: true
              pitch: "Thanos goes after the six Infinity Stones, and nearly every Marvel hero so far stands in his way. It ends on a snap."
            - title: "Endgame"
              done: true
              pitch: "The survivors of the snap get one shot at undoing it. The payoff for twenty-two films, and for two years the highest-grossing film ever."
        - title: "Forrest Gump"
          year: 1994
          done: true
          rating: 2.0
          cover: "forrest-gump"
          pitch: "A kind, simple man from Alabama stumbles through thirty years of American history, from Vietnam to a ping pong tour of China, while waiting for Jenny. It won Best Picture."
          blurb: "I thought it was funny, and had a couple of good lines. I did see it young and didn't really get the relevance."
        - title: "The Shawshank Redemption"
          year: 1994
          done: false
          cover: "shawshank-redemption"
          pitch: "A banker convicted of killing his wife spends two decades in Shawshank prison, where he finds a friend in Red and a way to keep hoping. It flopped in theaters, then found its audience on video and cable."
        - title: "Finding Nemo"
          year: 2003
          done: true
          rating: 3.0
          cover: "finding-nemo"
          pitch: "A nervous clownfish crosses the ocean to find his son, with a forgetful blue tang named Dory along for the ride."
          blurb: "I probably saw the first movie over 20 times as it was the only movie we had on a house boat for like a week and we just put it on for background noise for the kids. Great movie, and the sequel was also fun."
          series:
            - title: "Finding Nemo"
              done: true
            - title: "Finding Dory"
              done: true
              pitch: "Dory remembers she has a family and sets off to find them, ending up inside a California marine institute."
        - title: "Home Alone"
          year: 1990
          done: true
          rating: 2.5
          cover: "home-alone"
          pitch: "Kevin McCallister gets left behind when his family flies to Paris for Christmas, and defends the house from two burglars with paint cans and a blowtorch."
          blurb: "It was an adorable set of movies, and as the middle child who has been forgotten a couple of times, I find it relatable."
          series:
            - title: "Home Alone"
              done: true
            - title: "Home Alone 2: Lost in New York"
              done: true
              pitch: "Kevin gets on the wrong plane, ends up alone in New York and runs into the same two burglars."
        - title: "Indiana Jones"
          year: 1981
          done: true
          rating: 2.5
          cover: "indiana-jones"
          pitch: "Harrison Ford as an archaeologist who keeps getting into fistfights with Nazis over ancient relics. Raiders of the Lost Ark is the adventure movie in its purest form."
          blurb: "I saw all these movies with my dad, and he really enjoys this stuff. I have a good time as well but if it weren't for my dad, I probably wouldn't go and see these. Blows my mind that Indy wasn't at all relevant in the first movie to the plot."
          series:
            - title: "Raiders of the Lost Ark"
              done: true
            - title: "Temple of Doom"
              done: true
              pitch: "A prequel set in India: Indy, a nightclub singer and a kid named Short Round take on a cult. The darkest of the five, mine cart chase included."
            - title: "The Last Crusade"
              done: true
              pitch: "Indy and his father, played by Sean Connery, race the Nazis to the Holy Grail. The funniest of the films."
            - title: "Kingdom of the Crystal Skull"
              done: true
              pitch: "It's 1957, the villains are Soviets and the relic is a crystal skull with ties to aliens. Fans are still sore about the fridge."
            - title: "Dial of Destiny"
              done: true
              pitch: "An aging Indy goes after Archimedes' dial before a former Nazi scientist can use it. Harrison Ford's last time in the hat."
        - title: "Pulp Fiction"
          year: 1994
          done: false
          cover: "pulp-fiction"
          pitch: "Two hitmen, a boxer, a gangster's wife and a mysterious briefcase, told out of order. Tarantino's breakout, full of lines people still quote."
        - title: "E.T. the Extra-Terrestrial"
          year: 1982
          done: true
          rating: 1.5
          cover: "et-the-extra-terrestrial"
          pitch: "A boy hides a stranded alien in his house and helps him phone home. The bike flying past the moon became the logo of Spielberg's company, Amblin."
          blurb: "I liked space as a kid, even went to space camp. E.T. just looked kinda gross, and it didn't really give or grow my appreciation for space."
        - title: "The Sound of Music"
          year: 1965
          done: false
          cover: "sound-of-music"
          pitch: "A novice nun becomes governess to the seven children of a widowed Austrian naval captain on the eve of the Nazi annexation. Julie Andrews, Best Picture, and songs you already know."
        - title: "Jaws"
          year: 1975
          done: false
          cover: "jaws"
          pitch: "A great white shark starts eating swimmers at a beach town before the Fourth of July, and three men go out to kill it. The original summer blockbuster."
        - title: "Pirates of the Caribbean"
          year: 2003
          done: true
          rating: 4.0
          cover: "pirates-of-the-caribbean"
          pitch: "A movie based on a theme park ride had no business working, then Johnny Depp showed up as Captain Jack Sparrow. The first one is a great swashbuckler, and the sequels get bigger and stranger."
          blurb: "DUN DUN DUNNA DUH DUH DUN DUN DUNNA DA DA DUH DUN DA!"
          series:
            - title: "The Curse of the Black Pearl"
              done: true
            - title: "Dead Man's Chest"
              done: true
              pitch: "Jack owes his soul to Davy Jones, and everyone wants the chest that holds Jones's heart."
            - title: "At World's End"
              done: true
              pitch: "The crew sails to the land of the dead to bring Jack back for a last war against the East India Company."
            - title: "On Stranger Tides"
              done: true
              pitch: "Jack and Blackbeard race each other to the Fountain of Youth."
            - title: "Dead Men Tell No Tales"
              done: false
              pitch: "A ghost captain named Salazar escapes the Devil's Triangle to hunt Jack, while Will Turner's son searches for Poseidon's trident."
        - title: "Avatar"
          year: 2009
          done: true
          rating: 2.0
          cover: "avatar"
          pitch: "James Cameron's trip to the moon Pandora, and still the highest-grossing film ever made. The plot is simple, so watch it for the world, on the biggest screen you can find."
          blurb: "It's isekai for Americans. I think it was a fine movie but I have no desire to watch the sequels."
          series:
            - title: "Avatar"
              done: true
            - title: "The Way of Water"
              done: false
              pitch: "Jake Sully's family flees to Pandora's reef clans when the humans come back. Much of it was shot underwater."
            - title: "Fire and Ash"
              done: false
              pitch: "The Sullys run into the Ash People, a hostile Na'vi clan, as the war over Pandora goes on."
        - title: "The Incredibles"
          year: 2004
          done: true
          rating: 2.5
          cover: "incredibles"
          pitch: "Superheroes have been outlawed, so Mr. Incredible is stuck in an insurance job until a secret mission pulls his whole family back in. Brad Bird's spy movie in a supersuit."
          blurb: "I had a lot of fun with this as a kid. Idk why but it made super heroes feel a little more accessible to craft up? I started drawing some comic doodles around this time of various heroes."
          series:
            - title: "The Incredibles"
              done: true
            - title: "Incredibles 2"
              done: false
              pitch: "Picking up right where the first ends, Elastigirl goes on a mission while Bob stays home with the kids, and baby Jack-Jack's powers start showing up."
        - title: "Inception"
          year: 2010
          done: true
          rating: 1.5
          cover: "inception"
          pitch: "A team of thieves breaks into people's dreams, and this time they have to plant an idea instead of stealing one. Nolan's heist movie, with a spinning top ending people still argue about."
          blurb: "I don't have much thoughts on this, it didn't strike me as a particularly good twist, and I hardly remember the actual plot beyond the premise of entering peoples dreams."
        - title: "Fight Club"
          year: 1999
          done: false
          cover: "fight-club"
          pitch: "An insomniac office worker meets a soap salesman named Tyler Durden, and the underground fight club they start grows into something much worse. Read nothing about it first."
        - title: "Spider-Man"
          year: 2002
          done: true
          rating: 3.0
          cover: "spider-man"
          pitch: "Sam Raimi's trilogy with Tobey Maguire, the Spider-Man our generation grew up on. The train fight in Spider-Man 2 is still one of the best superhero scenes there is."
          blurb: "Good super hero, great message. It also helps strengthen my own philosophy that all authority comes with accountability."
          series:
            - title: "Spider-Man"
              done: true
            - title: "Spider-Man 2"
              done: true
              pitch: "Peter Parker is broke, behind in school and losing his powers, and then Doctor Octopus shows up."
            - title: "Spider-Man 3"
              done: true
              pitch: "Venom, Sandman and a black suit that makes Peter strut down the street. The source of a hundred memes."
        - title: "The Hunger Games"
          year: 2012
          done: true
          rating: 3.0
          cover: "hunger-games"
          pitch: "Katniss Everdeen volunteers for a televised fight to the death to save her little sister, and turns the Capitol's show into the start of a revolution. The YA adaptation that actually worked."
          blurb: "I read all the books and saw all the movies. It was a fun novel experience for me and the fam. It kicked off the young adult genre for me."
          series:
            - title: "The Hunger Games"
              done: true
            - title: "Catching Fire"
              done: true
              pitch: "The Capitol sends Katniss and Peeta back into the arena with past winners, and this time the districts are watching. The best of the films."
            - title: "Mockingjay – Part 1"
              done: true
              pitch: "Katniss becomes the face of the rebellion in District 13's propaganda war against President Snow."
            - title: "Mockingjay – Part 2"
              done: true
              pitch: "The rebels march on the Capitol for the last fight."
            - title: "The Ballad of Songbirds & Snakes"
              done: true
              pitch: "A prequel set decades earlier: a young Coriolanus Snow mentors a girl from District 12 in the tenth Hunger Games."
        - title: "Monsters, Inc."
          year: 2001
          done: true
          rating: 2.0
          cover: "monsters-inc"
          pitch: "Monsters power their city with children's screams, and a little girl named Boo gets loose in the factory. Sulley and Mike are one of Pixar's best double acts."
          blurb: "It was a cute fun movie. Glad I saw it, but wasn't super impactful on me."
          series:
            - title: "Monsters, Inc."
              done: true
            - title: "Monsters University"
              done: false
              pitch: "A prequel: how Mike and Sulley went from rivals at scaring school to best friends."
        - title: "Gladiator"
          year: 2000
          done: true
          rating: 2.0
          cover: "gladiator"
          pitch: "A Roman general is betrayed by the new emperor, sold into slavery and fights his way back to Rome in the arena. Best Picture, and Best Actor for Russell Crowe."
          blurb: "I saw it as a kid and thought it was cool, but I need to give it a re-watch."
          series:
            - title: "Gladiator"
              done: true
            - title: "Gladiator II"
              done: false
              pitch: "Years later, Lucius, the boy from the first film, is enslaved and forced into the Colosseum himself."
        - title: "A Knight's Tale"
          year: 2001
          done: true
          rating: 5.0
          cover: "knights-tale"
          pitch: "A peasant squire fakes a noble pedigree to compete in medieval jousting tournaments, all set to a 70s rock soundtrack. Heath Ledger's breakout, with Paul Bettany as a gambling-addicted Geoffrey Chaucer."
          blurb: "My favorite film. When William comes back to his blind father. That genuinely gets a tear out of me."
        - title: "Saving Private Ryan"
          year: 1998
          done: false
          cover: "saving-private-ryan"
          pitch: "After D-Day, a squad is sent behind enemy lines to bring home a paratrooper whose three brothers have all been killed. The Omaha Beach opening changed how war movies are shot."
        - title: "Mean Girls"
          year: 2004
          done: false
          cover: "mean-girls"
          pitch: "A teenager who grew up homeschooled in Africa starts at an American high school and falls in with the Plastics. Tina Fey wrote it, and on Wednesdays we wear pink."
        - title: "Aladdin"
          year: 1992
          done: true
          rating: 2.5
          cover: "aladdin"
          pitch: "A street thief, a princess, a magic lamp and Robin Williams as the Genie, doing every voice he can think of."
          blurb: "The Genie carried this movie, but I didn't much care for Aladdin himself. I remember getting frustrated with his round-aboutness of his wishes."
        - title: "Interstellar"
          year: 2014
          done: false
          cover: "interstellar"
          pitch: "Crops are failing across Earth, so a former pilot leaves his kids behind to search for a new home through a wormhole near Saturn. The physicist Kip Thorne worked on the science, and Hans Zimmer's organ score does the rest."
        - title: "Knives Out"
          year: 2019
          done: false
          cover: "knives-out"
          pitch: "Detective Benoit Blanc, Daniel Craig with a thick Southern drawl, investigates the death of a rich mystery novelist whose whole family had a motive. Rian Johnson's modern whodunits, each one a standalone case."
          series:
            - title: "Knives Out"
              done: false
            - title: "Glass Onion"
              done: false
              pitch: "Blanc joins a tech billionaire's murder-mystery weekend on his private Greek island, and the game turns real."
            - title: "Wake Up Dead Man"
              done: false
              pitch: "A disliked monsignor is found dead on Good Friday in a small upstate New York parish, and Blanc works the case with the young priest who looks most guilty, played by Josh O'Connor."
        - title: "The Silence of the Lambs"
          year: 1991
          done: false
          cover: "silence-of-the-lambs"
          pitch: "An FBI trainee asks an imprisoned cannibal psychiatrist, Hannibal Lecter, to help her catch a serial killer. One of only three films to win all five of the top Oscars."
        - title: "Schindler's List"
          year: 1993
          done: false
          cover: "schindlers-list"
          pitch: "A German businessman saves more than a thousand Jews during the Holocaust by employing them in his factories. Spielberg's Best Picture winner, shot almost entirely in black and white."
        - title: "The Passion of the Christ"
          year: 2004
          done: false
          cover: "passion-of-the-christ"
          pitch: "Mel Gibson's film of the last twelve hours of Jesus's life, spoken in Aramaic, Hebrew and Latin. Graphic and hard to watch, and for over a decade the highest-grossing R-rated film in the US."
        - title: "Up"
          year: 2009
          done: true
          rating: 2.0
          cover: "up"
          pitch: "A widower ties thousands of balloons to his house and floats off to South America, with a young Wilderness Explorer stuck on the porch. The first ten minutes are famous for a reason."
          blurb: "Good movie but not much of an impact on me."
        - title: "WALL-E"
          year: 2008
          done: true
          rating: 2.5
          cover: "wall-e"
          pitch: "A trash-compacting robot left alone on an abandoned Earth falls for a sleek probe named EVE and follows her into space. Its first act has almost no dialogue."
          blurb: "Y'know the idiocracy and laziness that seems to be growing might make this movie prophetic."
        - title: "Ghostbusters"
          year: 1984
          done: false
          cover: "ghostbusters"
          pitch: "Three scientists lose their university jobs and start a ghost-catching business in New York. Bill Murray, Dan Aykroyd, Harold Ramis and a giant marshmallow man."
          series:
            - title: "Ghostbusters"
              done: false
            - title: "Ghostbusters II"
              done: false
              pitch: "Five years later, the team gets back together when a river of slime turns up under New York."
            - title: "Ghostbusters: Afterlife"
              done: false
              pitch: "Egon Spengler's grandkids find his old gear on a farm in Oklahoma."
            - title: "Ghostbusters: Frozen Empire"
              done: false
              pitch: "Egon's family moves into the old firehouse just as an ancient ghost threatens to freeze New York."
        - title: "Goodfellas"
          year: 1990
          done: false
          cover: "goodfellas"
          pitch: "Thirty years in the mob through the eyes of Henry Hill, who always wanted to be a gangster. Scorsese at his fastest and funniest."
        - title: "The Princess Bride"
          year: 1987
          done: true
          rating: 4.0
          cover: "princess-bride"
          pitch: "A grandfather reads his sick grandson a story about a farm boy, a princess, a giant and a Spanish swordsman hunting the six-fingered man who killed his father. Nearly every line is quotable."
          blurb: "Perfect Valentine's Day film. I love this love story. It's also hysterical!"
        - title: "Elf"
          year: 2003
          done: true
          rating: 3.5
          cover: "elf"
          pitch: "A human raised by elves at the North Pole goes to New York to find his real father. A Christmas movie people actually rewatch every year."
          blurb: "It's on our yearly Christmas rotation of must watch films. I can recite most of this film. It definitely makes the season start to feel like Christmas."
        - title: "How the Grinch Stole Christmas"
          year: 2000
          done: true
          rating: 4.5
          cover: "grinch"
          pitch: "Jim Carrey, under hours of green makeup, plays the Grinch, who sets out to steal Christmas from the Whos down in Whoville. Ron Howard's live-action take on the Dr. Seuss book."
          blurb: "I say the lines under my breath as this film plays in the Yule-Tide background. We've watched it every year without fail since we got the DVD. It's tradition!"
        - title: "Monty Python and the Holy Grail"
          year: 1975
          done: true
          rating: 4.0
          cover: "holy-grail"
          pitch: "King Arthur and his knights search for the Holy Grail on a budget so small they couldn't afford horses, so they bang coconuts together instead. Engineers have been quoting it for fifty years."
          blurb: "This is a movie my Dad and I will quote at each other the moment anything tangentially related comes up that deserves a Monty Python quote."
        - title: "Top Gun"
          year: 1986
          done: false
          cover: "top-gun"
          pitch: "Tom Cruise as Maverick, a hotshot Navy pilot at the Top Gun school, with a volleyball scene everyone remembers. The sequel came 36 years later and beat the original."
          series:
            - title: "Top Gun"
              done: false
            - title: "Top Gun: Maverick"
              done: false
              pitch: "Maverick goes back to Top Gun to train pilots for a near-impossible mission, among them the son of his late wingman, Goose. The actors really flew in the jets."
        - title: "Napoleon Dynamite"
          year: 2004
          done: true
          rating: 3.5
          cover: "napoleon-dynamite"
          pitch: "An awkward Idaho teenager helps his new friend Pedro run for class president. Made for about $400,000 and quoted in every high school hallway of the mid-2000s."
          blurb: "My cousins and I will quote this movie at each other. Seeing that we all went through that 2000's teenage angst together!"
        - title: "Groundhog Day"
          year: 1993
          done: true
          rating: 3.5
          cover: "groundhog-day"
          pitch: "A grumpy weatherman wakes up to the same day in a small Pennsylvania town over and over again. Bill Murray's best, and the reason the title is now a phrase."
          blurb: "Not only was this a good movie, but it's philosophically relevant and really makes you think outside the movie when the premise hits you."
        - title: "About Time"
          year: 2013
          done: false
          cover: "about-time"
          pitch: "A young man learns that the men in his family can travel back through their own lives, and uses it first for love and then for something bigger. Richard Curtis wrote it, with Bill Nighy as his dad."
        - title: "How to Train Your Dragon"
          year: 2010
          done: true
          rating: 4.0
          cover: "how-to-train-your-dragon"
          pitch: "A Viking kid who can't bring himself to kill a dragon befriends one instead. DreamWorks' best trilogy, and John Powell's score is worth the watch on its own."
          blurb: "Probably my favorite Dreamworks production. There's a few moments in this trilogy that just punch me in the gut."
          series:
            - title: "How to Train Your Dragon"
              done: true
            - title: "How to Train Your Dragon 2"
              done: true
              pitch: "Five years later, Hiccup and Toothless find Hiccup's long-lost mother and a dragon trapper building an army."
            - title: "The Hidden World"
              done: true
              pitch: "Hiccup searches for the hidden homeland of the dragons while a hunter goes after Toothless."
        - title: "The Truman Show"
          year: 1998
          done: true
          rating: 3.0
          cover: "truman-show"
          pitch: "Truman Burbank doesn't know his whole life is a TV show, broadcast live around the clock from a giant dome. Jim Carrey's best dramatic role."
          blurb: "This was good, good acting and good premise. It does get brought up in some philosophical discussions sometimes. I feel like it could've meant more to me though."
        - title: "Ferris Bueller's Day Off"
          year: 1986
          done: true
          rating: 2.5
          cover: "ferris-bueller"
          pitch: "A high schooler fakes sick and takes his best friend and girlfriend on a day out in Chicago, with the principal on his trail."
          blurb: "Does Ferris exist though? Feels like he's just a figment of the side-guy's imagination."
        - title: "Anchorman"
          year: 2004
          done: false
          cover: "anchorman"
          pitch: "Ron Burgundy, San Diego's top anchorman in the 1970s, feels threatened when a woman joins the newsroom. Will Ferrell at his most quotable."
          series:
            - title: "Anchorman: The Legend of Ron Burgundy"
              done: false
            - title: "Anchorman 2: The Legend Continues"
              done: false
              pitch: "Ron and the news team move to New York to work on one of the first 24-hour news channels."
        - title: "Superbad"
          year: 2007
          done: false
          cover: "superbad"
          pitch: "Two best friends try to score alcohol for a party before they split up for college. Seth Rogen and Evan Goldberg started writing it as teenagers, and McLovin is why everyone remembers it."
        - title: "The Hangover"
          year: 2009
          done: true
          rating: 2.0
          cover: "hangover"
          pitch: "Three friends wake up in a trashed Las Vegas suite with no memory of the night, a tiger in the bathroom and the groom missing."
          blurb: "It got some laughs out of me."
          series:
            - title: "The Hangover"
              done: true
            - title: "The Hangover Part II"
              done: false
              pitch: "The same thing happens again, this time in Bangkok."
            - title: "The Hangover Part III"
              done: false
              pitch: "The Wolfpack goes after Mr. Chow, with no wedding this time."
        - title: "Good Will Hunting"
          year: 1997
          done: false
          cover: "good-will-hunting"
          pitch: "A janitor at MIT turns out to be a math genius, and a therapist played by Robin Williams tries to get through to him. Matt Damon and Ben Affleck won the screenplay Oscar for writing it."
        - title: "The Green Mile"
          year: 1999
          done: false
          cover: "green-mile"
          pitch: "A death row guard in 1935 meets a gentle giant convicted of murder who seems able to heal people. Tom Hanks, from a Stephen King serial novel."
        - title: "The Sixth Sense"
          year: 1999
          done: true
          rating: 2.0
          cover: "sixth-sense"
          pitch: "A child psychologist tries to help a boy who says he sees dead people. Go in knowing as little as possible."
          blurb: "\"I see dead people\" is quotable, the twist predictable. The watch, fun."
        - title: "The Departed"
          year: 2006
          done: false
          cover: "departed"
          pitch: "A cop goes undercover in the Boston mob while a mobster goes undercover in the police, and each is hunting the other. It finally won Scorsese Best Director."
        - title: "Se7en"
          year: 1995
          done: false
          cover: "se7en"
          pitch: "Two detectives hunt a killer whose murders follow the seven deadly sins. David Fincher's bleakest thriller, with an ending everyone knows about."
        - title: "The Social Network"
          year: 2010
          done: false
          cover: "social-network"
          pitch: "How Mark Zuckerberg built Facebook in a Harvard dorm room and got sued by nearly everyone around him. Aaron Sorkin's script, with a Trent Reznor score."
        - title: "Spider-Man: Into the Spider-Verse"
          year: 2018
          done: false
          cover: "spider-verse"
          pitch: "Brooklyn teenager Miles Morales becomes Spider-Man and meets Spider-People from other dimensions. It looks like a comic book come to life, and studios have been borrowing the style ever since."
          series:
            - title: "Into the Spider-Verse"
              done: false
            - title: "Across the Spider-Verse"
              done: false
              pitch: "Miles follows Gwen Stacy across the multiverse and runs into a society of Spider-People who think his story has to go a certain way."
        - title: "Mad Max: Fury Road"
          year: 2015
          done: false
          cover: "mad-max-fury-road"
          pitch: "Two hours of car chase across a desert wasteland, with Charlize Theron's Furiosa as the real lead. It won six Oscars."
        - title: "Ratatouille"
          year: 2007
          done: true
          rating: 2.0
          cover: "ratatouille"
          pitch: "A rat who wants to be a chef teams up with a kitchen boy in a Paris restaurant, steering him by pulling his hair. The food critic's speech near the end is one of Pixar's best scenes."
          blurb: "Cute, fun, and bad moral lesson. It's got the same Shrek problem of \"I'll risk everyone for the sake of my dream\"."
        - title: "Austin Powers"
          year: 1997
          done: false
          cover: "austin-powers"
          pitch: "A swinging 60s spy is unfrozen in the 1990s to stop Dr. Evil. Mike Myers plays both, and the Bond spoofs get sillier with every film."
          series:
            - title: "International Man of Mystery"
              done: false
            - title: "The Spy Who Shagged Me"
              done: false
              pitch: "Dr. Evil travels back to 1969 to steal Austin's mojo, and Mini-Me joins the family."
            - title: "Goldmember"
              done: false
              pitch: "Dr. Evil teams up with a Dutch villain named Goldmember to kidnap Austin's father, played by Michael Caine."
        - title: "Kung Fu Panda"
          year: 2008
          done: true
          rating: 2.5
          cover: "kung-fu-panda"
          pitch: "A clumsy panda from a noodle shop is named the Dragon Warrior over the Furious Five, who trained their whole lives for it. Jack Black's best role, with beautiful fight scenes."
          blurb: "I liked it, it was fun, Jack Black is super expressive. I think the moral was good too that Po is enough."
          series:
            - title: "Kung Fu Panda"
              done: true
            - title: "Kung Fu Panda 2"
              done: false
              pitch: "Po learns where he came from while stopping a peacock whose new cannon could end kung fu."
            - title: "Kung Fu Panda 3"
              done: false
              pitch: "Po finds his birth father and a hidden panda village as a spirit warrior steals the chi of China's masters."
            - title: "Kung Fu Panda 4"
              done: false
              pitch: "Po has to pick his successor as Dragon Warrior while a shapeshifting sorceress called the Chameleon raises his old enemies."
        - title: "School of Rock"
          year: 2003
          done: true
          rating: 2.5
          cover: "school-of-rock"
          pitch: "A failed rock guitarist poses as a substitute teacher at a prep school and turns his class into a band. Jack Black was made for it."
          blurb: "A very fun movie with a dubious moral. Please don't lie to get ahead. If it does work in the real world it always comes at a cost and the debt will come knocking."
        - title: "Parasite"
          year: 2019
          done: false
          cover: "parasite"
          pitch: "A poor family cons its way into working for a rich one, one job at a time, until it all goes very wrong. The first non-English film to win Best Picture."
        - title: "A Man for All Seasons"
          year: 1966
          done: false
          cover: "man-for-all-seasons"
          pitch: "Paul Scofield as Sir Thomas More, who won't approve Henry VIII's divorce and pays for it with his life. It won Best Picture."
        - title: "The Mission"
          year: 1986
          done: false
          cover: "the-mission"
          pitch: "Jesuit missionaries in 18th-century South America try to protect a Guaraní community caught between Spain and Portugal. Robert De Niro and Jeremy Irons, with Ennio Morricone's score, and the Palme d'Or."
        - title: "Lilies of the Field"
          year: 1963
          done: false
          cover: "lilies-of-the-field"
          pitch: "A traveling handyman stops at a farm in the Arizona desert where a group of East German nuns are sure God sent him to build their chapel. Sidney Poitier became the first Black man to win Best Actor for it."
        - title: "The Prestige"
          year: 2006
          done: false
          cover: "prestige"
          pitch: "Two rival magicians in Victorian London try to ruin each other over one trick. Nolan's puzzle box, with Hugh Jackman, Christian Bale and David Bowie as Nikola Tesla."
        - title: "Inside Out"
          year: 2015
          done: true
          rating: 2.5
          cover: "inside-out"
          pitch: "The emotions inside an eleven-year-old's head, Joy, Sadness, Anger, Fear and Disgust, try to steer her through a move across the country."
          blurb: "It's a cute play on emotions. Though I don't like the characters."
          series:
            - title: "Inside Out"
              done: true
            - title: "Inside Out 2"
              done: false
              pitch: "Riley turns thirteen, and Anxiety moves into headquarters with a few new emotions."
        - title: "Coco"
          year: 2017
          done: false
          cover: "coco"
          pitch: "A boy who dreams of being a musician ends up in the Land of the Dead on Día de los Muertos and has to get home by sunrise. The ending gets everyone."
        - title: "Catch Me If You Can"
          year: 2002
          done: false
          cover: "catch-me-if-you-can"
          pitch: "A teenage con man poses as a pilot, a doctor and a lawyer while an FBI agent chases him across the world. Loosely based on Frank Abagnale's memoir."
        - title: "Mulan"
          year: 1998
          done: true
          rating: 2.5
          cover: "mulan"
          pitch: "A young woman disguises herself as a man to take her father's place in the army. Comes with Eddie Murphy as a tiny dragon and 'I'll Make a Man Out of You'."
        - title: "Whiplash"
          year: 2014
          done: false
          cover: "whiplash"
          pitch: "A young jazz drummer at a top music school and the abusive teacher who pushes him until he bleeds. J.K. Simmons won an Oscar for the teacher."
        - title: "The Tree of Life"
          year: 2011
          done: false
          cover: "tree-of-life"
          pitch: "Terrence Malick sets a 1950s Texas family's story, with Brad Pitt as a strict father, against the birth of the universe. Won the Palme d'Or."
        - title: "A Hidden Life"
          year: 2019
          done: false
          cover: "hidden-life"
          pitch: "Terrence Malick's film about Franz Jägerstätter, an Austrian farmer executed for refusing to swear loyalty to Hitler. Long, quiet and beautiful."
        - title: "Calvary"
          year: 2014
          done: false
          cover: "calvary"
          pitch: "A good priest in rural Ireland is told in confession that he'll be killed in a week, for the sins of another priest. Brendan Gleeson in a dark comedy-drama."
        - title: "Step Brothers"
          year: 2008
          done: false
          cover: "step-brothers"
          pitch: "Two forty-year-old men who still live with their parents become stepbrothers when those parents marry. Will Ferrell and John C. Reilly as overgrown children."
        - title: "The Cornetto Trilogy"
          year: 2004
          done: false
          cover: "cornetto-trilogy"
          pitch: "Edgar Wright, Simon Pegg and Nick Frost made three loosely linked British comedies, each one spoofing a genre and each with a Cornetto ice cream in it."
          series:
            - title: "Shaun of the Dead"
              done: false
            - title: "Hot Fuzz"
              done: false
              pitch: "A London supercop is transferred to a sleepy village with a suspicious number of accidents. A buddy cop spoof."
            - title: "The World's End"
              done: false
              pitch: "Five old friends retry an epic pub crawl in their hometown and find it's been taken over by robots."
        - title: "Dodgeball"
          year: 2004
          done: false
          cover: "dodgeball"
          pitch: "The owner of a run-down gym enters a dodgeball tournament to save it from Ben Stiller's corporate fitness chain. If you can dodge a wrench, you can dodge a ball."
        - title: "The Iron Giant"
          year: 1999
          done: true
          rating: 3.0
          cover: "iron-giant"
          pitch: "A boy in 1957 Maine befriends a giant robot from space while a government agent hunts it down. It flopped in theaters and became a cult classic."
          blurb: "Weirdly enough I credit this movie with my initial interest in space, even though it had very little to do with space."
        - title: "Something Wicked This Way Comes"
          year: 1983
          done: false
          cover: "something-wicked"
          pitch: "A sinister carnival led by the mysterious Mr. Dark rolls into a small Illinois town, and two boys discover it grants wishes at a terrible price. Disney's adaptation of Ray Bradbury's novel, with Jonathan Pryce."
        - title: "The Emperor's New Groove"
          year: 2000
          done: true
          rating: 4.0
          cover: "emperors-new-groove"
          pitch: "A selfish young emperor is turned into a llama and has to rely on the peasant he wronged to get home. Disney's funniest film, and Kronk is why."
          blurb: "This is a movie I can watch multiple times. It's funny and bad choices are meant to feel like bad choices. The smug irredeemable Kuzco getting redeemed only after intense humility is biblical."
        - title: "21 Jump Street"
          year: 2012
          done: false
          cover: "21-jump-street"
          pitch: "Two failed cops go undercover at a high school, where the nerd is suddenly cool and the jock isn't. Jonah Hill and Channing Tatum make a great pair."
          series:
            - title: "21 Jump Street"
              done: false
            - title: "22 Jump Street"
              done: false
              pitch: "This time they go undercover at college, and the movie spends most of its time making fun of sequels."
        - title: "Tropic Thunder"
          year: 2008
          done: false
          cover: "tropic-thunder"
          pitch: "A cast of spoiled actors shooting a Vietnam war movie end up stranded in a real jungle. Tom Cruise's cameo as a foul-mouthed studio boss steals it."
        - title: "Wedding Crashers"
          year: 2005
          done: false
          cover: "wedding-crashers"
          pitch: "Two divorce mediators crash weddings to pick up women, until one of them falls for a senator's daughter."
        - title: "Keeper"
          year: 2025
          done: false
          cover: "keeper"
          pitch: "Liz and her boyfriend Malcolm spend their anniversary at his remote cabin, and something there starts coming for her. Osgood Perkins, director of Longlegs, shot it before The Monkey, with Tatiana Maslany in the lead; critics were split."
    - label: "Shows"
      kind: "show"
      items:
        - title: "The Simpsons"
          year: 1989
          done: true
          rating: 2.5
          cover: "simpsons"
          pitch: "The longest-running scripted primetime show in America. Seasons three through nine are the ones people quote."
          more: true
          blurb: "The Fastfood of TV shows."
        - title: "Friends"
          year: 1994
          done: false
          cover: "friends"
          pitch: "Six friends in their twenties in Manhattan, mostly hanging out at a coffee shop. It's been on in the background of every millennial's life."
        - title: "Breaking Bad"
          year: 2008
          done: true
          rating: 3.0
          cover: "breaking-bad"
          pitch: "A high school chemistry teacher with terminal cancer starts cooking meth to provide for his family, and slowly turns into someone they won't recognize. Five seasons with almost no filler."
          blurb: "It was a fun story to see how power corrupts."
        - title: "Game of Thrones"
          year: 2011
          done: true
          rating: 3.0
          cover: "game-of-thrones"
          pitch: "Noble houses fight over the Iron Throne while something far worse gathers beyond the Wall. The first four seasons are as good as TV gets, and people are still arguing about the ending."
          blurb: "The world is so rich, and I'm sure the books are even more amazing. I wish the show runners didn't flub the resolutions so hard with the latter seasons."
        - title: "The Office"
          year: 2005
          done: false
          cover: "office"
          pitch: "The Scranton branch of a paper company and its manager, Michael Scott, who badly wants everyone to love him. Push past season one."
        - title: "Seinfeld"
          year: 1989
          done: false
          cover: "seinfeld"
          pitch: "The show about nothing: Jerry, George, Elaine and Kramer, four selfish New Yorkers obsessing over small things."
        - title: "SpongeBob SquarePants"
          year: 1999
          done: true
          rating: 3.5
          cover: "spongebob"
          pitch: "A sponge who flips Krabby Patties in Bikini Bottom, and his best friend Patrick. The first three seasons are half the internet's reaction images."
          more: true
          blurb: "I could quote this show all day. Integral to my childhood."
        - title: "The Sopranos"
          year: 1999
          done: false
          cover: "sopranos"
          pitch: "A New Jersey mob boss starts seeing a therapist for his panic attacks. The show that kicked off the prestige TV era."
        - title: "Stranger Things"
          year: 2016
          done: false
          cover: "stranger-things"
          pitch: "A boy vanishes in 1983 Indiana, and his friends find a girl with psychic powers who escaped a government lab. Built out of 80s Spielberg and Stephen King, D&D campaign included."
        - title: "Avatar: The Last Airbender"
          year: 2005
          done: true
          rating: 4.5
          cover: "last-airbender"
          pitch: "In a world where some people can bend the elements, the last Airbender wakes up after a hundred years frozen in ice and has to stop the Fire Nation. One of the best stories in animation, kids' show or not."
          blurb: "This is one of the best coming of age stories of my generation. Korra though is just a Mary Sue and dragged the world building through the mud."
          series:
            - title: "Avatar: The Last Airbender"
              done: true
            - title: "The Legend of Korra"
              done: true
              pitch: "Seventy years later, the next Avatar, a hotheaded Water Tribe girl, learns airbending in a city that's racing into the industrial age."
        - title: "South Park"
          year: 1997
          done: true
          rating: 3.5
          cover: "south-park"
          pitch: "Four foul-mouthed fourth graders in a Colorado mountain town. Episodes are made in about a week, so they can mock whatever is in the news."
          more: true
          blurb: "Fast Food but more culturally relevant. It got a bit repetitive with the Trump stuff. Still beats most fast food type shows."
        - title: "The Wire"
          year: 2002
          done: false
          cover: "wire"
          pitch: "The Baltimore drug trade, seen from a new corner of the city each season: the street, the police, the docks, city hall, the schools and the newspaper. Slow to start and worth it."
        - title: "Lost"
          year: 2004
          done: false
          cover: "lost"
          pitch: "A plane crashes on a strange island, and the survivors find polar bears, a smoke monster and a hatch in the ground. Watch it for the characters, since not every mystery gets an answer."
        - title: "Family Guy"
          year: 1999
          done: true
          rating: 2.5
          cover: "family-guy"
          pitch: "Peter Griffin, his family and a talking dog in Rhode Island, mostly as an excuse for cutaway gags."
          more: true
          blurb: "It's Fast Food like the Simpsons and only marginally different. Fun, but meh."
        - title: "The Fresh Prince of Bel-Air"
          year: 1990
          done: false
          cover: "fresh-prince"
          pitch: "Will Smith plays a kid from West Philadelphia sent to live with his rich aunt and uncle in Bel-Air. You already know the theme song."
        - title: "The Walking Dead"
          year: 2010
          done: true
          rating: 2.5
          cover: "walking-dead"
          pitch: "A sheriff's deputy wakes from a coma into a zombie apocalypse and ends up leading a group of survivors. For a few years in the early 2010s it was the biggest show on TV."
          more: true
          blurb: "I think it was pretty fun while I watched it. I got up to Negan. I just don't feel the need to continue watching it."
        - title: "How I Met Your Mother"
          year: 2005
          done: false
          cover: "how-i-met-your-mother"
          pitch: "In 2030, Ted tells his kids the very long story of how he met their mother. Barney Stinson is legendary; the ending splits people."
        - title: "The Big Bang Theory"
          year: 2007
          done: true
          rating: 2.5
          cover: "big-bang-theory"
          pitch: "Four Caltech scientists and Penny, their neighbor across the hall. Twelve seasons, and one of the most-watched sitcoms of its time."
          blurb: "It's dorky and cute. Sheldon is a meme. I don't have much to say on it."
        - title: "Futurama"
          year: 1999
          done: false
          cover: "futurama"
          pitch: "A pizza delivery boy is frozen on New Year's Eve 1999 and wakes up in the year 3000. Matt Groening's other show, written by a room with math degrees."
        - title: "Rick and Morty"
          year: 2013
          done: true
          rating: 3.0
          cover: "rick-and-morty"
          pitch: "A drunk mad scientist drags his anxious grandson on adventures across the multiverse. Dark, gross and smarter than it lets on."
          more: true
          blurb: "The early seasons had me at the edge of my seat waiting for the new episodes. I lost interest though."
        - title: "Parks and Recreation"
          year: 2009
          done: true
          rating: 3.0
          cover: "parks-and-recreation"
          pitch: "Leslie Knope runs the parks department of a small Indiana town with endless optimism, next to Ron Swanson, who'd like government to disappear. It gets great in season two."
          blurb: "This is my first \"The Office\" styled show. It was fun and I had a good time watching it."
        - title: "Mad Men"
          year: 2007
          done: false
          cover: "mad-men"
          pitch: "A 1960s Madison Avenue ad man living under a stolen identity, with the decade changing around him."
        - title: "Black Mirror"
          year: 2011
          done: true
          rating: 3.5
          cover: "black-mirror"
          pitch: "A standalone story each episode about technology going wrong in the near future. Start with 'San Junipero' or 'White Christmas'."
          more: true
          blurb: "It's hard to give this a rating because each episode is like its own movie and it can sway up and down a point from 4.5 to 2.5. The Bees is just Death Note btw."
        - title: "That '70s Show"
          year: 1998
          done: false
          cover: "that-70s-show"
          pitch: "Teenagers hanging out in a Wisconsin basement in the late 1970s while Red Forman threatens to put his foot somewhere unpleasant."
        - title: "Malcolm in the Middle"
          year: 2000
          done: false
          cover: "malcolm-in-the-middle"
          pitch: "A gifted kid stuck in a loud, broke family of brothers, with Bryan Cranston as the dad years before Breaking Bad."
        - title: "Band of Brothers"
          year: 2001
          done: false
          cover: "band-of-brothers"
          pitch: "Easy Company of the 101st Airborne, from training through D-Day and Bastogne to Hitler's Eagle's Nest. Ten episodes from Spielberg and Tom Hanks, based on the real men."
        - title: "Rugrats"
          year: 1991
          done: true
          rating: 3.0
          cover: "rugrats"
          pitch: "Babies go on big adventures in the backyard while the grown-ups don't notice. Angelica was the villain of our childhoods."
          blurb: "The Rugrats Movie was peak, though the show still gave me a lot of entertainment and memories as a kid. Reptar is the goat!"
        - title: "Squid Game"
          year: 2021
          done: true
          rating: 3.0
          cover: "squid-game"
          pitch: "Hundreds of people buried in debt compete in deadly versions of children's games for a huge cash prize. Korean, and worth the subtitles."
          more: true
          blurb: "I only saw the first season and honestly that's all I'll ever need to see. It was well written and gives me Battle Royale vibes. It's a sort of horror, and I like scary stuff."
        - title: "Arrested Development"
          year: 2003
          done: false
          cover: "arrested-development"
          pitch: "A rich family loses everything when the father is arrested, and the one sane son tries to hold them together. The jokes build across episodes, so it rewards a rewatch."
        - title: "Better Call Saul"
          year: 2015
          done: false
          cover: "better-call-saul"
          pitch: "Years before he was Breaking Bad's sleazy lawyer, Saul Goodman was Jimmy McGill, a small-time con man trying to go straight. Some fans rank it above Breaking Bad."
        - title: "Scrubs"
          year: 2001
          done: false
          cover: "scrubs"
          pitch: "J.D.'s years as a young doctor at Sacred Heart hospital, told through his daydreams. Funny until it suddenly isn't."
        - title: "It's Always Sunny in Philadelphia"
          year: 2005
          done: false
          cover: "always-sunny"
          pitch: "Five terrible people run a dive bar in Philadelphia. The longest-running live-action sitcom in American TV history."
        - title: "Sherlock"
          year: 2010
          done: false
          cover: "sherlock"
          pitch: "Benedict Cumberbatch and Martin Freeman as Holmes and Watson in modern London. Each season is three feature-length episodes."
        - title: "Brooklyn Nine-Nine"
          year: 2013
          done: false
          cover: "brooklyn-nine-nine"
          pitch: "A goofy, brilliant detective and the stone-faced captain of a Brooklyn precinct. The Halloween heist episodes are the high point."
        - title: "Batman: The Animated Series"
          year: 1992
          done: false
          cover: "batman-animated-series"
          pitch: "Kevin Conroy as Batman and Mark Hamill as the Joker. The version of Batman a lot of people still call the best."
        - title: "King of the Hill"
          year: 1997
          done: true
          rating: 2.5
          cover: "king-of-the-hill"
          pitch: "Hank Hill sells propane and propane accessories in a small Texas town. Gentle, grounded and funnier than it looks."
          more: true
          blurb: "It's a Fast Food show. Not bad."
        - title: "Chernobyl"
          year: 2019
          done: false
          cover: "chernobyl"
          pitch: "The 1986 nuclear disaster and the scientists who fought the Soviet system to get the truth out. Five episodes that stay with you."
        - title: "The Mandalorian"
          year: 2019
          done: false
          cover: "mandalorian"
          pitch: "A Mandalorian bounty hunter takes a job delivering a small green child and ends up protecting him instead. Star Wars as a space western."
        - title: "The Last of Us"
          year: 2023
          done: false
          cover: "last-of-us"
          pitch: "Based on the video game: a smuggler escorts a teenage girl who may be the cure for a fungal pandemic across a ruined America. The third episode is the one everyone talks about."
        - title: "Adventure Time"
          year: 2010
          done: false
          cover: "adventure-time"
          pitch: "A boy and his shapeshifting dog in the Land of Ooo. It starts silly and slowly reveals the ruined world underneath."
        - title: "Community"
          year: 2009
          done: false
          cover: "community"
          pitch: "A disbarred lawyer forms a study group at a community college, and every few episodes the show turns into a parody of another genre. The paintball episodes are the place to start."
        - title: "Curb Your Enthusiasm"
          year: 2000
          done: false
          cover: "curb-your-enthusiasm"
          pitch: "Seinfeld co-creator Larry David plays himself and turns every small social rule into a fight. Mostly improvised."
        - title: "Succession"
          year: 2018
          done: false
          cover: "succession"
          pitch: "A media mogul's four children fight over who gets the company. Awful people trading very funny insults."
        - title: "The Powerpuff Girls"
          year: 1998
          done: true
          rating: 2.0
          cover: "powerpuff-girls"
          pitch: "Three kindergarten superheroes made of sugar, spice and Chemical X defend Townsville from Mojo Jojo."
          more: true
          blurb: "I didn't care for it so much when it was on, but it was fun to say MOJOJOJO!"
        - title: "Dexter's Laboratory"
          year: 1996
          done: true
          rating: 2.0
          cover: "dexters-laboratory"
          pitch: "A boy genius hides an enormous lab behind his bookcase, and his big sister Dee Dee keeps getting in."
          more: true
          blurb: "I didn't really *get* this as a kid. I'd watch it and be entertained, but wasn't integral."
        - title: "Hey Arnold!"
          year: 1996
          done: true
          rating: 2.0
          cover: "hey-arnold"
          pitch: "A kid with a football-shaped head lives in his grandparents' city boarding house. Helga's secret crush on him is Nickelodeon's best running joke."
          more: true
          blurb: "This was the older kid cartoon when it was airing. I couldn't relate. Maybe it's good though."
        - title: "Ed, Edd n Eddy"
          year: 1999
          done: true
          rating: 2.5
          cover: "ed-edd-n-eddy"
          pitch: "Three boys run scams on the other kids in their cul-de-sac to buy jawbreakers. They never work."
          more: true
          blurb: "I enjoyed the hijinks in this show! Trying to get those jawbreakers. Man was I disappointed when I had my first irl jawbreaker. They're cumbersome and too sweet for me for too long."
        - title: "Courage the Cowardly Dog"
          year: 1999
          done: true
          rating: 2.0
          cover: "courage"
          pitch: "A terrified pink dog protects his elderly owners from the monsters that keep turning up in the middle of Nowhere, Kansas. Creepier than a kids' show should be."
          more: true
          blurb: "I didn't like this as a kid, but I was easily frightened as a kid."
        - title: "Gravity Falls"
          year: 2012
          done: true
          rating: 4.0
          cover: "gravity-falls"
          pitch: "Twins spend the summer at their great-uncle's tourist trap in an Oregon town full of mysteries. Two seasons, with every clue planned from the start."
          blurb: "The lore is DEEP on this and me and my Sister watched this religiously together. Memories, and stellar writing!"
        - title: "Samurai Jack"
          year: 2001
          done: false
          cover: "samurai-jack"
          pitch: "A samurai is flung into a future ruled by the demon Aku and searches for a way back to his own time. Genndy Tartakovsky's show is nearly silent and gorgeous, and a fifth season finished the story in 2017."
        - title: "Teen Titans"
          year: 2003
          done: false
          cover: "teen-titans"
          pitch: "Robin, Starfire, Raven, Beast Boy and Cyborg protect Jump City. The original anime-styled series with the bigger story arcs, before Teen Titans Go!"
        - title: "Ted Lasso"
          year: 2020
          done: false
          cover: "ted-lasso"
          pitch: "An American college football coach is hired to manage an English soccer team, a sport he knows nothing about. Kind without being soft."
        - title: "30 Rock"
          year: 2006
          done: false
          cover: "30-rock"
          pitch: "Tina Fey runs a sketch comedy show at NBC, with Alec Baldwin as her boss. More jokes per minute than almost anything else on TV."
        - title: "Silicon Valley"
          year: 2014
          done: false
          cover: "silicon-valley"
          pitch: "A shy programmer invents a compression algorithm and tries to turn it into a startup. Engineers watch it like a documentary."
        - title: "Peaky Blinders"
          year: 2013
          done: false
          cover: "peaky-blinders"
          pitch: "Tommy Shelby's gang takes over Birmingham after World War I, razor blades sewn into their caps, to a modern rock soundtrack."
        - title: "Arcane"
          year: 2021
          done: true
          rating: 3.0
          cover: "arcane"
          pitch: "Two sisters end up on opposite sides of a war between a rich city and the undercity below it. Set in the League of Legends world, though you don't need to know the game, and it looks like a painting in motion."
          more: true
          blurb: "I don't play League of Legends, but the first season of this was good."
        - title: "BoJack Horseman"
          year: 2014
          done: true
          rating: 3.0
          cover: "bojack-horseman"
          pitch: "A washed-up horse who starred in a 90s sitcom tries to matter again in Hollywood. It starts as a cartoon comedy and becomes one of TV's best shows about depression."
          blurb: "It's well written and very real other than the horseplay of it all. It does capture that living in a dying society feeling that my generation has been feeling. Probably why nostalgia core is so popular."
        - title: "Schitt's Creek"
          year: 2015
          done: false
          cover: "schitts-creek"
          pitch: "A rich family goes broke and has to move to a small town they once bought as a joke. A slow start with a big payoff."
        - title: "Firefly"
          year: 2002
          done: false
          cover: "firefly"
          pitch: "A crew of smugglers on a small spaceship takes whatever work it can find: a western set in space. Canceled after one season, then wrapped up with the film Serenity."
        - title: "Severance"
          year: 2022
          done: false
          cover: "severance"
          pitch: "Office workers have their memories surgically split between work and home, so their work selves never get to leave the building. The best show about a job since The Office."
        - title: "What We Do in the Shadows"
          year: 2019
          done: false
          cover: "what-we-do-in-the-shadows"
          pitch: "A mockumentary about four vampire roommates on Staten Island, spun off from the Taika Waititi film."
    - label: "Anime"
      kind: "show"
      items:
        - title: "Spirited Away"
          year: 2001
          kind: "movie"
          done: true
          rating: 4.5
          cover: "spirited-away"
          pitch: "A girl wanders into a bathhouse for spirits and has to work there to free her parents, who've been turned into pigs. Hayao Miyazaki's best-known film, and it won the Oscar for Best Animated Feature."
          blurb: "This is my go to recommendation for anyone who hasn't watched anime before. It's a charming story that shows how much magic this medium can bring."
        - title: "Pokémon"
          year: 1997
          done: true
          rating: 3.0
          cover: "pokemon"
          pitch: "Ash Ketchum and Pikachu leave Pallet Town to become Pokémon Masters. The first season, Indigo League, is the one we all watched before school."
          more: true
          blurb: "This was peak when I was a kid, to this day I have most Pokemon memorized. We had the VHS tapes of season 1 when I was a kid. Though the rest of the series is so formulaic that I can't see myself actually watching all 1000+ episodes."
        - title: "Dragon Ball"
          year: 1986
          done: true
          rating: 3.0
          cover: "dragon-ball"
          pitch: "Goku, a monkey-tailed boy with superhuman strength, sets out to find the seven wish-granting Dragon Balls and grows up through one martial-arts tournament after another. Nearly every shonen since has borrowed from it."
          blurb: "This was the trend setter for a lot of shonen anime going forward. I watched it on variable 2-5x speed (sometimes 16x) so I can get to the good parts. So I'm guilty for not actually watching the full stuff."
          series:
            - title: "Dragon Ball"
              done: true
            - title: "Dragon Ball Z"
              done: true
              pitch: "Goku and his friends defend Earth from aliens, androids and a pink blob named Majin Buu, in fights that last for episodes. The heart of Toonami."
        - title: "Cowboy Bebop"
          year: 1998
          done: true
          rating: 2.5
          cover: "cowboy-bebop"
          pitch: "Broke bounty hunters drift around the solar system in 2071, set to a jazz soundtrack. A good first anime for people who don't watch anime."
          blurb: "This was charming and the opening song is a bop. I'd call it beautiful, and deep (with a side of wacky). Though I didn't have much take away from it."
        - title: "Death Note"
          year: 2006
          done: true
          rating: 3.0
          cover: "death-note"
          pitch: "A top student finds a notebook that kills anyone whose name he writes in it and sets out to rid the world of criminals. A cat-and-mouse game with a genius detective named L."
          blurb: "This was the show that got me to think that Anime was more than just Pokemon and Cartoons. I like the pseudo-intellectual cat and mouse of it all, the show makes you feel very smart."
        - title: "Fullmetal Alchemist"
          year: 2003
          done: true
          rating: 4.0
          cover: "fullmetal-alchemist"
          pitch: "Two brothers try to bring their mother back with alchemy, lose far too much, and set out to get their bodies back. The first adaptation caught up with the manga and went its own way."
          blurb: "Both entries into this art were great by my standards. I think the philosophy of this show is deep and impactful. It also plays on my favorite Father & Son motif."
          series:
            - title: "Fullmetal Alchemist"
              done: true
            - title: "Fullmetal Alchemist: Brotherhood"
              done: true
              pitch: "The retelling that follows the manga to its real ending. Fans often rank it the best anime ever made."
        - title: "Attack on Titan"
          year: 2013
          done: true
          rating: 3.0
          cover: "attack-on-titan"
          pitch: "Humanity hides behind giant walls from man-eating giants, until one breaks through. The show keeps changing what you think it's about."
          blurb: "I watched this around the same time as Game of Thrones and appreciated that the world started out feeling real and that no-one was safe. Then it later evolved into a Biblical Allegory if you look hard enough and poses some serious questions that I enjoyed."
        - title: "Naruto"
          year: 2002
          done: true
          rating: 4.0
          cover: "naruto"
          pitch: "An outcast ninja kid with a fox demon sealed inside him wants to become his village's leader. Long, with plenty of filler, and the source of the Naruto run."
          blurb: "This show was at the core of my weeb phase that I watched with my siblings. I even rewatched it all in my adulthood. I used to do the hand-signs for fireball, chidori, and shadow clone."
          series:
            - title: "Naruto"
              done: true
            - title: "Naruto: Shippuden"
              done: true
              pitch: "A few years older, Naruto comes home from training as the Akatsuki start hunting the tailed beasts, his included."
        - title: "Neon Genesis Evangelion"
          year: 1995
          done: false
          cover: "evangelion"
          pitch: "Teenagers pilot giant robots against mysterious Angels, and the show turns into a study of depression. Watch the film The End of Evangelion after episode 26."
        - title: "Princess Mononoke"
          year: 1997
          kind: "movie"
          done: true
          rating: 3.0
          cover: "princess-mononoke"
          pitch: "A cursed prince gets caught in a war between forest gods and an iron-mining town, and Miyazaki won't make either side the villain."
          blurb: "I like this one as art piece and it has good morals in it. The only complaint I have is that I wasn't super invested into the main character for some reason."
        - title: "Akira"
          year: 1988
          kind: "movie"
          done: false
          cover: "akira"
          pitch: "In a rebuilt Neo-Tokyo, a biker gang leader's best friend gains psychic powers the military can't contain. Every frame is hand-drawn, and it's the film that put anime on the map in the West."
        - title: "One Piece"
          year: 1999
          done: true
          rating: 5.0
          cover: "one-piece"
          pitch: "Monkey D. Luffy, a pirate with a rubber body, sails the Grand Line looking for the legendary treasure called the One Piece. Over a thousand episodes long, and fans swear the long arcs pay off."
          more: true
          blurb: "My favorite anime, and I've been on this ship for YEARS. Is it Stockholm Syndrome or beautiful world building and unforgettable characters? Watch over 1000+ episodes! Feels like a lot until you've caught up, then it feels like it wasn't enough."
        - title: "My Neighbor Totoro"
          year: 1988
          kind: "movie"
          done: true
          rating: 3.0
          cover: "my-neighbor-totoro"
          pitch: "Two sisters move to the countryside and meet the forest spirits living nearby, including a giant, fluffy one named Totoro. A gentle film with no villain, and Totoro became Studio Ghibli's logo."
          blurb: "It's a fun film, and you can't go wrong with Ghibli. Tangentially, I also remember getting scared as a kid by some Totoro creepy pasta and that kinda puts a different spin on this movie than a normal viewer would get."
        - title: "Kiki's Delivery Service"
          year: 1989
          kind: "movie"
          done: true
          rating: 4.5
          cover: "kikis-delivery-service"
          pitch: "A thirteen-year-old witch moves to a seaside town for her year of training and starts a flying delivery service, until her magic starts to fade. Miyazaki's gentlest film about growing up."
          blurb: "Low-key, my first cartoon crush. That and the story is so charming and its ability to romanticize the normalcy of every day life kindles something within me."
        - title: "Your Name"
          year: 2016
          kind: "movie"
          done: true
          rating: 2.5
          cover: "your-name"
          pitch: "A Tokyo boy and a country girl start waking up in each other's bodies, until the swaps suddenly stop. For a few years it was the highest-grossing anime film ever."
          blurb: "Beautifully animated and a good love story to watch. I've made a memory with this film."
        - title: "Hunter x Hunter"
          year: 2011
          done: true
          rating: 2.5
          cover: "hunter-x-hunter"
          pitch: "A boy sets out to pass the deadly Hunter Exam and find the father who left him. It starts as an adventure show, and the Chimera Ant arc goes somewhere much darker."
          more: true
          blurb: "Classic Shonen, though the Nen system is super intricate beyond what they show in the show and that was fun to theory craft with as an adult."
        - title: "Demon Slayer"
          year: 2019
          done: true
          rating: 2.5
          cover: "demon-slayer"
          pitch: "A boy joins the Demon Slayer Corps to find a cure for his sister, who has been turned into a demon. The animation, especially episode 19, is what made it a hit."
          more: true
          blurb: "Beautifully made, storyline is a bit predictable but otherwise the characters I enjoy. Inosuke is best boy."
        - title: "One-Punch Man"
          year: 2015
          done: true
          rating: 3.0
          cover: "one-punch-man"
          pitch: "A hero who can beat anyone with a single punch is bored out of his mind. A superhero parody whose first season has some of the best fight animation around."
          more: true
          blurb: "I watched season 1 of this and it's hilarious because it plays on the tropes of other shonen anime and it's parody quality is phenomenal. Had me laughing!"
        - title: "Jujutsu Kaisen"
          year: 2020
          done: true
          rating: 2.5
          cover: "jujutsu-kaisen"
          pitch: "A high schooler swallows a cursed finger to save his friends and ends up sharing his body with the King of Curses. Some of the best fight animation of recent years."
          more: true
          blurb: "It's Shonen edgy teen action. Which is fun, and I would've enjoyed it more as a teen than I get from it now."
        - title: "Howl's Moving Castle"
          year: 2004
          kind: "movie"
          done: true
          rating: 3.5
          cover: "howls-moving-castle"
          pitch: "A young hatmaker is cursed into an old woman and takes a job cleaning the walking castle of a vain wizard named Howl."
          blurb: "Not only is it well animated but the gusto to bring to life even the small moments to show the impact that has on an unreachable being like Howl is dignifying and honorable. It's a really good message."
        - title: "Code Geass"
          year: 2006
          done: true
          rating: 3.5
          cover: "code-geass"
          pitch: "An exiled prince gains the power to command anyone once and leads a rebellion against the empire that conquered Japan. Chess-match plotting with giant robots."
          blurb: "To me this was the better Death Note. The games played by the main character got to get to a grander scale and the intellectual turn-about was of higher caliber."
        - title: "Steins;Gate"
          year: 2011
          done: true
          rating: 3.5
          cover: "steins-gate"
          pitch: "A self-proclaimed mad scientist accidentally builds a microwave that sends texts into the past. The first half is slow, and then it becomes one of the best time-travel stories anywhere."
          blurb: "This did time travel right and Okabe is an inspirational character. In fact, each character in this show has so much charm. It also had great stakes and constantly had me questioning my perspective on what I thought I knew in the show."
        - title: "Mob Psycho 100"
          year: 2016
          done: true
          rating: 2.5
          cover: "mob-psycho-100"
          pitch: "A shy middle schooler with world-ending psychic powers just wants to be normal, and works for a con-artist exorcist. From the creator of One-Punch Man."
          more: true
          blurb: "I saw the first season of this and it's really cool for a show and the main duo have a fun dynamic going on between them. It's also inspirational that Mob doesn't just rest on his laurels of psychic powers and wants to work out to get his body in shape."
        - title: "Bleach"
          year: 2004
          done: true
          rating: 3.0
          cover: "bleach"
          pitch: "A teenager who can see ghosts becomes a Soul Reaper and fights the monsters called Hollows. Along with Naruto and One Piece, one of the big three of 2000s anime."
          more: true
          blurb: "It's a fun show and it's constantly recommended to me. I'm recently on episode 90ish, and this is my 2nd time getting this far. Maybe I'll skip the filler."
        - title: "Frieren: Beyond Journey's End"
          year: 2023
          done: true
          rating: 4.0
          cover: "frieren"
          pitch: "An elf mage who outlived her hero party sets out again to understand the humans she barely got to know. A quiet fantasy about time and grief."
          more: true
          blurb: "This one is a bit of a recent cultural nexus of memes, but it's also beautifully animated and it's discourse on demons is philosophically poignant."
        - title: "Vinland Saga"
          year: 2019
          done: false
          cover: "vinland-saga"
          pitch: "A boy fights for the Viking warband led by the man who killed his father, waiting for his chance at a duel. It starts as a revenge story and becomes one about what it takes to give up violence."
        - title: "Chainsaw Man"
          year: 2022
          done: false
          cover: "chainsaw-man"
          pitch: "A broke teenager fused with his chainsaw-devil dog becomes a government devil hunter, mostly for the free meals. Gory, grimy and darkly funny."
        - title: "JoJo's Bizarre Adventure"
          year: 2012
          done: false
          cover: "jojos-bizarre-adventure"
          pitch: "Generation after generation of the Joestar family fights vampires and, later, rivals with ghostly fighting spirits called Stands. Flamboyant, loud and the source of endless poses and memes."
        - title: "My Hero Academia"
          year: 2016
          done: false
          cover: "my-hero-academia"
          pitch: "In a world where most people are born with superpowers, a powerless boy inherits the power of the greatest hero and enrolls at a school for heroes. The defining superhero shonen of the 2010s."
        - title: "Puella Magi Madoka Magica"
          year: 2011
          done: false
          cover: "madoka-magica"
          pitch: "A cute-looking magical girl show where the wish-granting contracts come with a terrible price. Twelve episodes that rewrote the genre."
        - title: "Your Lie in April"
          year: 2014
          done: false
          cover: "your-lie-in-april"
          pitch: "A piano prodigy who stopped being able to hear his own playing after his mother died is dragged back to music by a free-spirited violinist. Bring tissues."
        - title: "Haikyu!!"
          year: 2014
          done: false
          cover: "haikyu"
          pitch: "A short kid obsessed with volleyball teams up with a gifted, prickly setter on a high school team that used to be great. The sports anime people who don't watch sports anime love."
        - title: "Mushoku Tensei: Jobless Reincarnation"
          year: 2021
          done: false
          cover: "mushoku-tensei"
          pitch: "A shut-in who dies in Tokyo is reborn in a world of magic and resolves to live his second life properly. Often credited as the start of the modern isekai wave, with a deeply flawed lead and lavish animation."
        - title: "Re:Zero"
          year: 2016
          done: false
          cover: "re-zero"
          pitch: "A teenager pulled into a fantasy world discovers that dying sends him back to an earlier moment, remembering everything that went wrong. Isekai where every death costs something."
        - title: "Samurai Champloo"
          year: 2004
          done: false
          cover: "samurai-champloo"
          pitch: "A wild swordsman, a stoic ronin and a girl looking for the samurai who smells of sunflowers wander Edo-period Japan to a hip-hop soundtrack. From Cowboy Bebop's director."
        - title: "Psycho-Pass"
          year: 2012
          done: false
          cover: "psycho-pass"
          pitch: "In a future Japan where a citywide system scans everyone's likelihood of committing a crime, a rookie inspector hunts criminals with guns that only fire on the guilty. Cyberpunk with real questions about free will."
        - title: "Sword Art Online"
          year: 2012
          done: false
          cover: "sword-art-online"
          pitch: "Ten thousand players are trapped in a virtual reality MMO where dying in the game means dying for real. The show that made trapped-in-a-game a genre."
        - title: "Trigun"
          year: 1998
          done: false
          cover: "trigun"
          pitch: "Vash the Stampede has a sixty-billion-double-dollar bounty on his head, yet refuses to kill anyone. A goofy space western that turns serious."
        - title: "FLCL"
          year: 2000
          done: false
          cover: "flcl"
          pitch: "A bored kid's suburban life ends when a Vespa-riding alien hits him with a bass guitar and robots start coming out of his head. Six chaotic episodes about growing up, set to the Pillows."
        - title: "Kaguya-sama: Love Is War"
          year: 2019
          done: false
          cover: "kaguya-sama"
          pitch: "Two student council geniuses are in love and too proud to confess, so each schemes to make the other say it first. A romantic comedy played like a war."
        - title: "The Promised Neverland"
          year: 2019
          done: false
          cover: "promised-neverland"
          pitch: "Orphans at an idyllic home discover what they're really being raised for and plan an escape. The first season is the tight thriller fans rave about."
        - title: "Dan Da Dan"
          year: 2024
          done: false
          cover: "dandadan"
          pitch: "A girl who believes in ghosts and a boy who believes in aliens find out both are real, and very hostile. Fast, strange and beautifully animated by Science Saru."
        - title: "Fruits Basket"
          year: 2019
          done: false
          cover: "fruits-basket"
          pitch: "An orphaned girl moves in with a family whose members turn into animals of the zodiac when hugged. The 2019 remake adapts the whole manga, heavier parts included."
        - title: "Clannad"
          year: 2007
          done: false
          cover: "clannad"
          pitch: "A delinquent high schooler helps a shy girl revive the school's drama club. Its sequel, After Story, is famous for wrecking viewers."
        - title: "Anohana: The Flower We Saw That Day"
          year: 2011
          done: false
          cover: "anohana"
          pitch: "Childhood friends who drifted apart reunite when the ghost of the friend who died young appears with a wish. Eleven episodes and a reliable tearjerker."
        - title: "Welcome to the NHK"
          year: 2006
          done: false
          cover: "welcome-to-the-nhk"
          pitch: "A college dropout who hasn't left his apartment in years blames a conspiracy, until a mysterious girl decides to cure him. A funny, uncomfortable and honest show about isolation."
        - title: "Tokyo Ghoul"
          year: 2014
          done: false
          cover: "tokyo-ghoul"
          pitch: "A college student turns half-ghoul after a deadly date and has to survive in hiding among flesh-eating monsters. Dark urban horror; the first season is the strongest."
        - title: "KonoSuba"
          year: 2016
          done: false
          cover: "konosuba"
          pitch: "A shut-in reborn in a fantasy world ends up with the most useless party imaginable, starting with the goddess he dragged along. The definitive isekai parody."
        - title: "Solo Leveling"
          year: 2024
          done: false
          cover: "solo-leveling"
          pitch: "The weakest hunter in a world of monster-filled dungeons gets a mysterious system that lets only him level up. Adapted from a huge Korean web novel and webtoon."
        - title: "Dr. Stone"
          year: 2019
          done: false
          cover: "dr-stone"
          pitch: "Thousands of years after all humanity was turned to stone, a science-obsessed teenager wakes up and sets out to rebuild civilization from scratch."
        - title: "Odd Taxi"
          year: 2021
          done: false
          cover: "odd-taxi"
          pitch: "A walrus taxi driver's passengers in a city of animals all turn out to be tied to a missing girl. A sharply written mystery that pays off every detail."
        - title: "The Apothecary Diaries"
          year: 2023
          done: false
          cover: "apothecary-diaries"
          pitch: "A sharp-witted apothecary sold into the imperial palace as a servant quietly solves poisonings and court mysteries. Palace intrigue with a terrific lead."
        - title: "To Your Eternity"
          year: 2021
          done: false
          cover: "to-your-eternity"
          pitch: "An immortal being sent to Earth takes the shapes of those it meets and learns to be human through a string of losses. From the author of A Silent Voice."
        - title: "Blue Lock"
          year: 2022
          done: false
          cover: "blue-lock"
          pitch: "Japan locks 300 high school strikers in a facility to forge the world's most selfish striker. Soccer as a battle royale."
        - title: "Black Clover"
          year: 2017
          done: false
          cover: "black-clover"
          pitch: "Two orphans dream of becoming the Wizard King, one a prodigy and one born without any magic at all. A classic long-running shonen that gets better as it goes."
        - title: "That Time I Got Reincarnated as a Slime"
          year: 2018
          done: false
          cover: "reincarnated-as-a-slime"
          pitch: "A salaryman killed in a stabbing is reborn as a slime in a fantasy world and starts building a nation of monsters. Cozy, overpowered isekai."
        - title: "Overlord"
          year: 2015
          done: false
          cover: "overlord"
          pitch: "A player stays logged in as his favorite game shuts down and finds himself trapped as its undead overlord, with fanatically loyal servants. Isekai from the villain's side."
        - title: "Dorohedoro"
          year: 2020
          done: false
          cover: "dorohedoro"
          pitch: "In a grimy city that sorcerers use for practice, a man with a lizard's head hunts the sorcerer who cursed him. Bloody, funny and unlike anything else."
        - title: "Ergo Proxy"
          year: 2006
          done: false
          cover: "ergo-proxy"
          pitch: "In a domed city built on obedience, an inspector investigates androids infected with a virus that makes them self-aware. Slow, dense, philosophical cyberpunk."
        - title: "The Saga of Tanya the Evil"
          year: 2017
          done: false
          cover: "tanya-the-evil"
          pitch: "A ruthless salaryman is reborn as a little girl in an alternate-history world war and becomes a terrifying mage officer just to survive."
        - title: "My Dress-Up Darling"
          year: 2022
          done: false
          cover: "my-dress-up-darling"
          pitch: "A loner who wants to craft traditional hina dolls gets recruited by his popular classmate to sew her cosplay outfits. A wholesome romcom about craft."
        - title: "Horimiya"
          year: 2021
          done: false
          cover: "horimiya"
          pitch: "A popular girl and a gloomy classmate discover each other's hidden sides outside school. A gentle romance that skips the will-they-won't-they."
        - title: "Tokyo Revengers"
          year: 2021
          done: false
          cover: "tokyo-revengers"
          pitch: "A dead-end twenty-something suddenly travels back to his middle school years and tries to save his ex-girlfriend by climbing the ranks of a delinquent gang."
        - title: "Kaiju No. 8"
          year: 2024
          done: false
          cover: "kaiju-no-8"
          pitch: "A 32-year-old who cleans up dead kaiju for a living, and once dreamed of fighting them, suddenly gains the power to turn into one."
        - title: "Magi: The Labyrinth of Magic"
          year: 2012
          done: false
          cover: "magi"
          pitch: "A cheerful boy with a djinn in his flute and a young merchant clear dungeons across an Arabian Nights world. An adventure that grows into politics and war."
        - title: "Ascendance of a Bookworm"
          year: 2019
          done: false
          cover: "ascendance-of-a-bookworm"
          pitch: "A book-loving woman is reborn as a sickly girl in a medieval world where books are a luxury, so she sets out to make them herself."
        - title: "Classroom of the Elite"
          year: 2017
          done: false
          cover: "classroom-of-the-elite"
          pitch: "At an elite school where classes compete for points that decide their futures, a quiet student in the lowest class plays everyone. Mind games in a school uniform."
        - title: "Moriarty the Patriot"
          year: 2020
          done: false
          cover: "moriarty-the-patriot"
          pitch: "Sherlock Holmes's nemesis as the lead: young William James Moriarty plots crimes against the cruelty of Victorian England's class system."
        - title: "Goblin Slayer"
          year: 2018
          done: false
          cover: "goblin-slayer"
          pitch: "An adventurer who only hunts goblins, the weakest monsters, because he knows how dangerous they really are. Dark fantasy with a brutal first episode."
        - title: "Witch Hat Atelier"
          year: 2026
          done: false
          cover: "witch-hat-atelier"
          pitch: "A girl who dreamed of magic learns that it's drawn, not born, and becomes a witch's apprentice. Adapted from one of the most beautifully drawn fantasy manga."
        - title: "Mashle: Magic and Muscles"
          year: 2023
          done: false
          cover: "mashle"
          pitch: "In a world where magic decides everything, a boy with none enrolls at a magic academy and solves every problem with muscle. Harry Potter meets One-Punch Man."
        - title: "Shangri-La Frontier"
          year: 2023
          done: false
          cover: "shangri-la-frontier"
          pitch: "A gamer who loves terrible, broken games finally takes on a hugely popular, polished VR game, and plays it like a speedrunner."
        - title: "Ghost Stories"
          year: 2000
          done: false
          cover: "ghost-stories"
          pitch: "A short horror anime about kids fighting ghosts, best known for its English dub, whose cast turned it into an anything-goes comedy."
        - title: "Working!!"
          year: 2010
          done: false
          cover: "working"
          pitch: "A workplace comedy at a family restaurant in Hokkaido, staffed by a sword-carrying waitress, a waitress who punches men on sight and a boy who loves small things."
        - title: "How Heavy Are the Dumbbells You Lift?"
          year: 2019
          done: false
          cover: "dumbbells"
          pitch: "A schoolgirl joins a gym to lose weight and gets swept up in its muscle culture. A comedy that teaches real exercises every episode."
        - title: "The Faraway Paladin"
          year: 2021
          done: false
          cover: "faraway-paladin"
          pitch: "A boy raised by three undead guardians in a ruined city learns everything they know, then sets out into the world. Earnest, old-fashioned fantasy."
        - title: "Cautious Hero"
          year: 2019
          done: false
          cover: "cautious-hero"
          pitch: "A goddess summons a hero with incredible stats who refuses to take any risks, grinding and over-preparing for everything. A comedy that skewers isekai."
        - title: "Kurau Phantom Memory"
          year: 2004
          done: false
          cover: "kurau-phantom-memory"
          pitch: "In 2100, a scientist's daughter fuses with an energy being in a lab accident. Years later, working as an agent for hire, a second being splits from her body as a girl of its own. A Bones sci-fi drama."
        - title: "To Be Hero X"
          year: 2025
          done: false
          cover: "to-be-hero-x"
          pitch: "In a world where heroes' powers come from public trust, the top heroes are ranked by it and meet in a tournament every two years. A Chinese-Japanese co-production mixing 2D and 3D."
        - title: "Campfire Cooking in Another World with My Absurd Skill"
          year: 2023
          done: false
          cover: "campfire-cooking"
          pitch: "A man summoned to a fantasy world gets a seemingly useless skill: online grocery shopping. It turns out legendary monsters love Japanese supermarket food."
        - title: "Sabikui Bisco"
          year: 2022
          done: false
          cover: "sabikui-bisco"
          pitch: "In a post-apocalyptic Japan eaten away by rust wind, a mushroom-shooting archer and a young doctor hunt for a legendary cure."
        - title: "Kill Blue"
          year: 2026
          done: false
          cover: "kill-blue"
          pitch: "A veteran assassin is stung by a strange wasp, shrinks into a fourteen-year-old, and has to go back to middle school. From the creator of Kuroko's Basketball."
        - title: "Though I Am an Inept Villainess"
          year: 2026
          done: false
          cover: "inept-villainess"
          pitch: "In a kingdom inspired by imperial China, a scorned consort candidate uses forbidden magic to swap bodies with the court's beloved maiden, who turns out to thrive in the villainess's place."
        - title: "Reborn as a Vending Machine, I Now Wander the Dungeon"
          year: 2023
          done: false
          cover: "vending-machine"
          pitch: "A man who loved vending machines is reborn as one in a fantasy dungeon. He can't move, so a strong-armed girl carries him around."
        - title: "The Daily Life of a Middle-Aged Online Shopper in Another World"
          year: 2025
          done: false
          cover: "middle-aged-online-shopper"
          pitch: "A nearly forty-year-old illustrator wakes up in a monster-filled forest in another world, with access to a huge online shopping site that delivers anything."
---
