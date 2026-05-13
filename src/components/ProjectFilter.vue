<script setup lang="ts">
// ProjectFilter — Vue island for tag-based filtering on /projects.
//
// Hydrated only on interaction or scroll (client:visible in the page),
// so it never blocks initial paint. The static HTML lists all projects
// pre-rendered; this script just hides/shows them based on tag clicks.

import { ref, computed, onMounted } from 'vue';

interface Props {
  tags: string[];
}

const props = defineProps<Props>();
const active = ref<string | null>(null);

const filterables = ref<HTMLElement[]>([]);

onMounted(() => {
  filterables.value = Array.from(
    document.querySelectorAll<HTMLElement>('[data-project-tags]'),
  );
});

function apply(tag: string | null) {
  active.value = tag;
  for (const el of filterables.value) {
    if (!tag) {
      el.hidden = false;
      continue;
    }
    const tags = (el.dataset.projectTags ?? '').split(',');
    el.hidden = !tags.includes(tag);
  }
}

const tagsSorted = computed(() => [...props.tags].sort((a, b) => a.localeCompare(b)));
</script>

<template>
  <div role="group" aria-label="Filter projects by tag" class="flex flex-wrap gap-2">
    <button
      type="button"
      class="rounded border border-border px-2 py-1 font-mono text-xs"
      :class="active === null ? 'bg-fg text-bg' : 'text-muted hover:text-fg'"
      :aria-pressed="active === null"
      @click="apply(null)"
    >
      all
    </button>
    <button
      v-for="tag in tagsSorted"
      :key="tag"
      type="button"
      class="rounded border border-border px-2 py-1 font-mono text-xs"
      :class="active === tag ? 'bg-fg text-bg' : 'text-muted hover:text-fg'"
      :aria-pressed="active === tag"
      @click="apply(tag)"
    >
      {{ tag }}
    </button>
  </div>
</template>
