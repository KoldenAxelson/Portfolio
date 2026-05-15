<script setup lang="ts">
// NetworkPanel — Finder-column-view network explorer.
//
// DESKTOP (lg+):
//   ┌──────────────┬────────────────────────────┐
//   │ LEFT (list)  │ RIGHT (carousel)           │
//   │ — owner      │   profile  ⇄  compose      │
//   │ — contact 1  │                             │
//   │ — contact 2  │   horizontal slide between  │
//   │   ...        │   the two panels            │
//   └──────────────┴────────────────────────────┘
//   The LEFT is always visible (sticky). The RIGHT carousels between the
//   selected profile and the compose form — no flicker, no list-disappears
//   moment. Click any name in the list to swap which profile is shown.
//
// MOBILE (<lg):
//   Single-pane drill-down: list → profile → compose, with explicit back
//   buttons. Still feels like the same flow, just one column at a time.

import { ref, computed, nextTick, watch } from 'vue';

interface Owner {
  name: string;
  title: string;
  email: string;
  /** Short bio shown when the visitor lands on the owner profile. */
  bio: string;
}

interface Contact {
  id: string;
  name: string;
  title: string;
  company?: string;
  blurb: string;
  relationship: string;
  link?: string;
}

interface Props {
  owner: Owner;
  contacts: Contact[];
}

const props = defineProps<Props>();

// ─────────── State ───────────
// selectedId: null = owner, otherwise contact id
const selectedId = ref<string | null>(null);
// view drives mobile single-pane rendering AND right-pane carousel
// position. On desktop, list is ALWAYS visible regardless of view; the
// view value only governs profile vs compose in the right pane.
const view = ref<'list' | 'profile' | 'compose'>('list');

const fromName = ref('');
const fromEmail = ref('');
const message = ref('');

const sectionRef = ref<HTMLElement | null>(null);

// ─────────── Derived ───────────
const isContactSelected = computed(() => selectedId.value !== null);

const activeProfile = computed<{
  name: string;
  title: string;
  company?: string;
  blurb: string;
  relationship?: string;
  link?: string;
  isOwner: boolean;
}>(() => {
  if (!selectedId.value) {
    return {
      name: props.owner.name,
      title: props.owner.title,
      blurb: props.owner.bio,
      isOwner: true,
    };
  }
  const c = props.contacts.find((x) => x.id === selectedId.value);
  if (!c) {
    return {
      name: props.owner.name,
      title: props.owner.title,
      blurb: props.owner.bio,
      isOwner: true,
    };
  }
  return { ...c, isOwner: false };
});

const mailto = computed(() => {
  const subject = isContactSelected.value
    ? `Intro request via your portfolio: ${activeProfile.value.name}`
    : 'Hi from your portfolio';

  const bodyLines: string[] = [];
  bodyLines.push(`Hi ${props.owner.name.split(' ')[0]},`, '');

  if (isContactSelected.value) {
    bodyLines.push(
      `I came across your portfolio and would love an introduction to ${activeProfile.value.name}` +
        (activeProfile.value.company ? ` at ${activeProfile.value.company}` : '') +
        '.',
      '',
    );
  }

  if (message.value.trim()) {
    bodyLines.push(message.value.trim(), '');
  } else {
    bodyLines.push('[your message here]', '');
  }

  bodyLines.push('Thanks,', fromName.value.trim() || '[your name]');
  if (fromEmail.value.trim()) bodyLines.push(fromEmail.value.trim());

  const body = bodyLines.join('\n');

  return (
    `mailto:${encodeURIComponent(props.owner.email)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
});

const composeReady = computed(() => message.value.trim().length > 0);

const cta = computed(() =>
  isContactSelected.value
    ? `Request intro to ${activeProfile.value.name.split(' ')[0]}`
    : 'Get in touch',
);

const messagePlaceholder = computed(() => {
  if (isContactSelected.value) {
    const ownerFirst = props.owner.name.split(' ')[0];
    const contactFirst = activeProfile.value.name.split(' ')[0];
    return `Tell ${ownerFirst} about the role and why ${contactFirst} would be a good fit.`;
  }
  return 'A few lines about why you are reaching out.';
});

const isCompose = computed(() => view.value === 'compose');

// ─────────── Mobile visibility ───────────
// On lg+ both panes are always visible; on mobile the view value governs
// which pane shows (single-column drill-down).
const listPaneClass = computed(() =>
  view.value === 'list' ? 'block' : 'hidden lg:block',
);
const rightPaneClass = computed(() =>
  view.value === 'list' ? 'hidden lg:block' : 'block',
);

// ─────────── Actions ───────────
function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
}

function scrollToTopOfPanel() {
  if (!isMobile()) return;
  nextTick(() => {
    sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function selectContact(id: string) {
  selectedId.value = id;
  // If the visitor was mid-compose for someone else, drop back to profile
  // mode so the new selection is what they see (the watch below resets
  // the form fields, so no stale message ends up sent to the wrong person).
  view.value = 'profile';
  scrollToTopOfPanel();
}

function selectOwner() {
  selectedId.value = null;
  view.value = 'profile';
  scrollToTopOfPanel();
}

function backToList() {
  view.value = 'list';
  scrollToTopOfPanel();
}

function openCompose() {
  view.value = 'compose';
  scrollToTopOfPanel();
}

function cancelCompose() {
  view.value = 'profile';
  scrollToTopOfPanel();
}

// Reset the form when the active profile changes so a message intended for
// one person doesn't accidentally get sent in another's context. Also flip
// out of compose mode if the visitor selected a different contact while
// composing — the existing message no longer matches the recipient.
watch(selectedId, () => {
  fromName.value = '';
  fromEmail.value = '';
  message.value = '';
  if (view.value === 'compose') view.value = 'profile';
});
</script>

<template>
  <section
    ref="sectionRef"
    class="grid scroll-mt-20 gap-6 lg:grid-cols-[20rem_1fr] lg:items-start lg:gap-8"
  >
    <!-- ─── LEFT: contact list (the persistent "explorer" column) ─── -->
    <aside
      :class="[
        listPaneClass,
        'lg:order-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto',
      ]"
    >
      <header class="mb-4 flex items-baseline justify-between">
        <h2 class="font-mono text-xs uppercase tracking-widest text-fg">My network</h2>
        <span class="font-mono text-xs text-muted">{{ contacts.length }} contacts</span>
      </header>

      <!-- Owner pinned above the contact list. Selected by default. -->
      <button
        type="button"
        @click="selectOwner"
        :aria-pressed="!isContactSelected"
        class="group flex w-full flex-col items-start rounded px-3 py-2 text-left transition"
        :class="
          !isContactSelected
            ? 'bg-accent/15 text-fg'
            : 'text-muted hover:bg-border/40 hover:text-fg'
        "
      >
        <span class="text-sm font-medium">{{ owner.name }}</span>
        <span class="font-mono text-xs uppercase tracking-widest text-muted">{{ owner.title }}</span>
      </button>

      <div v-if="contacts.length > 0" class="my-2 border-t border-border/40" aria-hidden="true" />

      <!-- Caps at ~6 visible (about 22rem worth of rows). Beyond that the
           list scrolls internally so the left pane doesn't grow taller
           than the right pane and skew the page layout. -->
      <ul
        :class="[
          'space-y-1',
          contacts.length > 6 ? 'scroll-slim max-h-[22rem] overflow-y-auto pr-1' : '',
        ]"
      >
        <li v-for="c in contacts" :key="c.id">
          <button
            type="button"
            @click="selectContact(c.id)"
            :aria-pressed="selectedId === c.id"
            class="group flex w-full flex-col items-start rounded px-3 py-2 text-left transition"
            :class="
              selectedId === c.id
                ? 'bg-accent/15 text-fg'
                : 'text-muted hover:bg-border/40 hover:text-fg'
            "
          >
            <span class="text-sm font-medium">{{ c.name }}</span>
            <span class="font-mono text-xs uppercase tracking-widest text-muted">
              {{ c.title }}<span v-if="c.company"> · {{ c.company }}</span>
            </span>
          </button>
        </li>
      </ul>

      <p class="mt-4 text-xs text-muted">
        <template v-if="contacts.length > 6">Scroll for more. </template>Tap a name to see how
        we know each other.
      </p>
    </aside>

    <!-- ─── RIGHT: carousel — profile ⇄ compose ─── -->
    <article :class="[rightPaneClass, 'lg:order-2']">
      <!-- Mobile-only: back to list. Always visible while in profile/compose. -->
      <button
        v-if="view !== 'list'"
        type="button"
        @click="backToList"
        class="-mt-2 mb-4 inline-flex items-center font-mono text-xs uppercase tracking-widest text-muted hover:!text-fg lg:hidden"
      >
        ← All connections
      </button>

      <!-- The carousel itself: a 2-slide horizontal track that translates
           by 100% when view === 'compose'. Both slides stay in the DOM so
           the transform animates smoothly; aria-hidden + inert hide the
           inactive slide from assistive tech and keyboard navigation. -->
      <div class="relative overflow-hidden">
        <div
          class="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
          :style="{ transform: isCompose ? 'translateX(-100%)' : 'translateX(0)' }"
        >
          <!-- ── Slide 1: profile ── -->
          <div
            class="w-full shrink-0"
            :inert="isCompose"
            :aria-hidden="isCompose ? 'true' : null"
          >
            <div
              class="rounded-lg border border-border bg-bg/30 p-6 lg:p-8"
              aria-labelledby="active-profile-name"
            >
              <header class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-mono text-xs uppercase tracking-widest text-muted">
                    {{ activeProfile.isOwner ? 'About me' : 'Connection' }}
                  </p>
                  <h2
                    id="active-profile-name"
                    class="mt-2 text-2xl font-medium tracking-tight text-fg sm:text-3xl"
                  >
                    {{ activeProfile.name }}
                  </h2>
                  <p class="mt-1 text-muted">
                    {{ activeProfile.title
                    }}<span v-if="activeProfile.company"> · {{ activeProfile.company }}</span>
                  </p>
                </div>
                <a
                  v-if="activeProfile.link"
                  :href="activeProfile.link"
                  rel="noopener"
                  class="group/verify shrink-0 font-mono text-xs uppercase tracking-widest text-muted no-underline hover:!text-accent"
                  :aria-label="`${activeProfile.name} on the web`"
                >
                  Verify
                  <span
                    aria-hidden="true"
                    class="inline-block transition-transform duration-200 ease-out motion-reduce:transition-none group-hover/verify:translate-x-0.5 group-hover/verify:-translate-y-0.5"
                  >
                    ↗
                  </span>
                </a>
              </header>

              <p class="mt-5 leading-relaxed text-fg/90">{{ activeProfile.blurb }}</p>

              <p
                v-if="!activeProfile.isOwner && activeProfile.relationship"
                class="mt-4 border-l-2 border-accent/40 pl-3 text-sm italic text-muted"
              >
                How we know each other: {{ activeProfile.relationship }}
              </p>

              <div class="mt-6">
                <button
                  type="button"
                  @click="openCompose"
                  class="group/cta rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-fg transition hover:bg-accent hover:!text-bg"
                >
                  {{ cta }}
                  <span
                    aria-hidden="true"
                    class="ml-0.5 inline-block transition-transform duration-200 ease-out motion-reduce:transition-none group-hover/cta:translate-x-0.5"
                  >→</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ── Slide 2: compose ── -->
          <div
            class="w-full shrink-0"
            :inert="!isCompose"
            :aria-hidden="!isCompose ? 'true' : null"
          >
            <form
              class="rounded-lg border border-border bg-bg/30 p-6 lg:p-8"
              @submit.prevent=""
            >
              <header class="mb-4 flex items-baseline justify-between">
                <h2 class="text-lg font-medium tracking-tight text-fg">
                  {{ isContactSelected ? `Request intro to ${activeProfile.name.split(' ')[0]}` : 'Get in touch' }}
                </h2>
                <button
                  type="button"
                  @click="cancelCompose"
                  class="font-mono text-xs uppercase tracking-widest text-muted hover:!text-fg"
                >
                  ← back to profile
                </button>
              </header>

              <p class="mb-5 text-sm text-muted">
                <template v-if="isContactSelected">
                  This message goes to {{ owner.name.split(' ')[0] }}. They decide whether to make
                  the introduction.
                </template>
                <template v-else>
                  Drops straight into {{ owner.name.split(' ')[0] }}'s inbox via your mail client.
                </template>
              </p>

              <div class="space-y-4">
                <div>
                  <label for="net-from-name" class="block text-xs font-medium text-muted"
                    >Your name</label
                  >
                  <input
                    id="net-from-name"
                    v-model="fromName"
                    type="text"
                    autocomplete="name"
                    class="mt-1 w-full rounded border border-border bg-bg/50 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="Recruiter at Acme"
                  />
                </div>

                <div>
                  <label for="net-from-email" class="block text-xs font-medium text-muted">
                    Your email
                    <span class="text-muted/70">(optional — your mail client fills From)</span>
                  </label>
                  <input
                    id="net-from-email"
                    v-model="fromEmail"
                    type="email"
                    autocomplete="email"
                    class="mt-1 w-full rounded border border-border bg-bg/50 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="alex@acme.io"
                  />
                </div>

                <div>
                  <label for="net-message" class="block text-xs font-medium text-muted"
                    >Message</label
                  >
                  <textarea
                    id="net-message"
                    v-model="message"
                    rows="5"
                    required
                    class="mt-1 w-full rounded border border-border bg-bg/50 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                    :placeholder="messagePlaceholder"
                  ></textarea>
                </div>

                <a
                  :href="mailto"
                  :aria-disabled="!composeReady"
                  :tabindex="composeReady ? 0 : -1"
                  class="group/cta block w-full rounded border border-accent bg-accent/10 px-4 py-2 text-center text-sm font-medium no-underline transition"
                  :class="
                    composeReady
                      ? 'text-fg hover:bg-accent hover:!text-bg'
                      : 'pointer-events-none text-muted opacity-60'
                  "
                >
                  Open in mail client
                  <span
                    aria-hidden="true"
                    class="ml-0.5 inline-block transition-transform duration-200 ease-out motion-reduce:transition-none group-hover/cta:translate-x-0.5"
                  >→</span>
                </a>

                <p class="text-xs text-muted">
                  Prefer it direct?
                  <a :href="`mailto:${owner.email}`" class="underline">{{ owner.email }}</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
