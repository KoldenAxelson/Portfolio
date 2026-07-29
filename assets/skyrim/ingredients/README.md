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

Slugs currently in use:

    canis-root          hanging-moss        elves-ear
    hawk-beak           snowberries         dragons-tongue
    fly-amanita         mora-tapinella
    salmon-roe          garlic              nordic-barnacle
    corkbulb-root       stoneflower-petals
