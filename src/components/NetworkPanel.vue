<script setup lang="ts">
// NetworkPanel — interactive "social proof" widget.
//
// Two visual modes depending on viewport:
//
// DESKTOP (lg+): two panels side-by-side.
//   Left  = active mini-profile (owner by default, or selected contact)
//   Right = sticky scrollable list of contacts; swaps to compose form
//           when the visitor clicks Request Intro / Get in touch.
//
// MOBILE (<lg): single-view drill-down. Exactly one of:
//   - List   (default — owner pinned at top, contacts below)
//   - Profile (after tapping a name; with "← All connections" back)
//   - Compose (after tapping Request Intro / Get in touch; with "← back")
//
// Submitting the form opens the visitor's mail client via mailto:.
// Works on any static host. Forkers wanting an API-backed form can swap
// the submit href for a fetch() to /api/contact in ~5 lines.

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
  avatar?: string;
}

interface Props {
  owner: Owner;
  contacts: Contact[];
}

const props = defineProps<Props>();

// ─────────── State ───────────
// selectedId: null = owner, otherwise contact id
const selectedId = ref<string | null>(null);
// view drives mobile single-pane rendering. On desktop, the layout shows
// list+profile side-by-side regardless of whether view is 'list' or 'profile'.
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
  avatar?: string;
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

// ─────────── Mobile visibility ───────────
// Tailwind classes that hide/show panels on small screens; on lg+ both panels are visible.
const profilePaneClass = computed(() =>
  view.value === 'profile' ? 'block' : 'hidden lg:block',
);
const rightPaneClass = computed(() =>
  view.value === 'profile' ? 'hidden lg:block' : 'block',
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
  // Return to profile if a profile was being viewed, otherwise the list.
  view.value = isContactSelected.value ? 'profile' : 'list';
  scrollToTopOfPanel();
}

// Reset the form when the active profile changes so a message intended for
// one person doesn't accidentally get sent in another's context.
watch(selectedId, () => {
  fromName.value = '';
  fromEmail.value = '';
  message.value = '';
});
</script>

<template>
  <section
    ref="sectionRef"
    class="scroll-mt-20 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8"
  >
    <!-- ─── LEFT: profile ─── -->
    <article
      :class="['rounded-lg border border-border bg-bg/30 p-6 lg:order-1 lg:p-8', profilePaneClass]"
      aria-labelledby="active-profile-name"
    >
      <!-- Mobile-only back-to-list button -->
      <button
        type="button"
        @click="backToList"
        class="-mt-2 mb-4 inline-flex items-center font-mono text-xs uppercase tracking-widest text-muted hover:!text-fg lg:hidden"
      >
        ← All connections
      </button>

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
          class="shrink-0 font-mono text-xs uppercase tracking-widest text-muted hover:!text-accent"
          :aria-label="`${activeProfile.name} on the web`"
        >
          Verify ↗
        </a>
      </header>

      <p class="mt-5 leading-relaxed text-fg/90">{{ activeProfile.blurb }}</p>

      <p
        v-if="!activeProfile.isOwner && activeProfile.relationship"
        class="mt-4 border-l-2 border-accent/40 pl-3 text-sm italic text-muted"
      >
        How we know each other: {{ activeProfile.relationship }}
      </p>

      <div class="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          @click="openCompose"
          class="rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-fg transition hover:bg-accent hover:!text-bg"
        >
          {{ cta }} →
        </button>
        <!-- Desktop-only quick switch back to owner profile -->
        <button
          v-if="!activeProfile.isOwner"
          type="button"
          @click="selectOwner"
          class="hidden text-sm text-muted hover:!text-fg lg:inline"
        >
          ← back to {{ owner.name.split(' ')[0] }}'s profile
        </button>
      </div>
    </article>

    <!-- ─── RIGHT: list OR compose ─── -->
    <!-- Sticky on desktop with internal scroll so 30+ contacts don't push the page tall. -->
    <aside
      :class="[
        rightPaneClass,
        'lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto',
      ]"
    >
      <!-- LIST -->
      <div v-if="view !== 'compose'">
        <header class="mb-4 flex items-baseline justify-between">
          <h2 class="font-mono text-xs uppercase tracking-widest text-fg">My network</h2>
          <span class="font-mono text-xs text-muted">{{ contacts.length }} contacts</span>
        </header>

        <!-- Owner pinned above the scrollable contact list. Always visible. -->
        <button
          type="button"
          @click="selectOwner"
          :aria-pressed="!isContactSelected"
          class="group flex w-full flex-col items-start rounded px-3 py-2 text-left transition"
          :class="
            !isContactSelected && view !== 'list'
              ? 'bg-accent/15 text-fg'
              : 'text-muted hover:bg-border/40 hover:text-fg'
          "
        >
          <span class="text-sm font-medium">{{ owner.name }}</span>
          <span class="font-mono text-xs uppercase tracking-widest text-muted">{{ owner.title }}</span>
        </button>

        <!-- Divider between "me" and "my contacts" — only when there are contacts. -->
        <div v-if="contacts.length > 0" class="my-2 border-t border-border/40" aria-hidden="true" />

        <!-- Contact list. Caps at ~6 visible; scrolls when 7+. -->
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
      </div>

      <!-- COMPOSE -->
      <form v-else class="space-y-4" @submit.prevent="">
        <header class="flex items-baseline justify-between">
          <h2 class="font-mono text-xs uppercase tracking-widest text-fg">
            {{ isContactSelected ? 'Request an intro' : 'Email me' }}
          </h2>
          <button
            type="button"
            @click="cancelCompose"
            class="font-mono text-xs uppercase tracking-widest text-muted hover:!text-fg"
          >
            ← back
          </button>
        </header>

        <p class="text-xs text-muted">
          <template v-if="isContactSelected">
            This message goes to {{ owner.name.split(' ')[0] }}. They decide whether to make the
            introduction.
          </template>
          <template v-else>
            Drops straight into {{ owner.name.split(' ')[0] }}'s inbox via your mail client.
          </template>
        </p>

        <div>
          <label for="net-from-name" class="block text-xs font-medium text-muted">Your name</label>
          <input
            id="net-from-name"
            v-model="fromName"
            type="text"
            autocomplete="name"
            class="mt-1 w-full rounded border border-border bg-bg/50 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            placeholder="Recruiter at Example Corp"
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
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label for="net-message" class="block text-xs font-medium text-muted">Message</label>
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
          class="block w-full rounded border border-accent bg-accent/10 px-4 py-2 text-center text-sm font-medium transition"
          :class="
            composeReady
              ? 'text-fg hover:bg-accent hover:!text-bg'
              : 'pointer-events-none text-muted opacity-60'
          "
        >
          Open in mail client →
        </a>

        <p class="text-xs text-muted">
          Prefer it direct? <a :href="`mailto:${owner.email}`" class="underline">{{ owner.email }}</a>
        </p>
      </form>
    </aside>
  </section>
</template>
