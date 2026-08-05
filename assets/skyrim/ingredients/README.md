# Ingredient art

Drop an image in here named after its slug in `data/skyrim/ingredients.yaml`:

```
assets/skyrim/ingredients/canis-root.png
assets/skyrim/ingredients/dragons-tongue.png
```

`.png` is checked first, then `.webp`, `.jpg`, `.jpeg` — the first that exists
wins. Nothing else needs editing: the next build picks the file up wherever that
ingredient appears.

Anything wider than 192px is fitted down and converted to WebP by Hugo Pipes.
Smaller art is passed through untouched, so pixel-exact item icons stay crisp
rather than being resampled.

Until a file is here, the card draws the accent-circle "?" placeholder. That is
the normal state for a new recipe, not a failure — write the recipe first and
let the art arrive one file at a time.

**The set is complete: 183 files for 183 ingredients, all 48×48.** So a "?" on
the page now means a slug and a filename have drifted apart, not that art is
missing. The names must be the slug *exactly* — hyphens, never underscores, all
lowercase. `blue_mountain_flower.png` resolves to nothing and fails silently;
`resources.Get` returning nil is not an error in Hugo. Two that bite: it is
`taproot`, one word, and `red-kelp-gas-bladder`, not gladder.

To check the whole set after adding files:

```sh
cd assets/skyrim/ingredients
comm -3 <(grep -E '^[a-z0-9][a-z0-9-]*:$' ../../../data/skyrim/ingredients.yaml \
           | tr -d ':' | sed 's/$/.png/' | sort) \
        <(ls -1 *.png | sort)
```

Silence means every slug has art and no file is orphaned.
