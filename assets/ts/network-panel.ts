// Network explorer — Alpine.js component, loaded only on /network. owner +
// contacts come from the #network-data JSON script tag.

declare global {
  interface Window {
    Alpine: { data: (name: string, factory: () => unknown) => void };
  }
}

interface Owner {
  name: string;
  title: string;
  email: string;
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

interface Profile {
  name: string;
  title: string;
  company?: string;
  blurb: string;
  relationship?: string;
  link?: string;
  isOwner: boolean;
}

// Alpine-injected "magic" props, mixed into `this` where methods need them.
interface AlpineMagics {
  $watch(property: string, callback: () => void): void;
  $nextTick(callback: () => void): void;
  $root: HTMLElement;
}

// Component shape. The returned literal is annotated with this so `this` resolves
// in getters too (getters can't take a `this` param).
interface NetworkPanel {
  owner: Owner;
  contacts: Contact[];
  selectedId: string | null;
  view: 'list' | 'profile' | 'compose';
  fromName: string;
  fromEmail: string;
  message: string;
  readonly isContactSelected: boolean;
  readonly activeProfile: Profile;
  readonly isCompose: boolean;
  readonly composeReady: boolean;
  readonly cta: string;
  readonly messagePlaceholder: string;
  readonly mailto: string;
  readonly listPaneClass: string;
  readonly rightPaneClass: string;
  init(): void;
  isMobile(): boolean;
  scrollToTopOfPanel(): void;
  selectContact(id: string): void;
  selectOwner(): void;
  backToList(): void;
  openCompose(): void;
  cancelCompose(): void;
}

document.addEventListener('alpine:init', () => {
  window.Alpine.data('networkPanel', (): NetworkPanel => {
    const el = document.getElementById('network-data');
    const data = el ? (JSON.parse(el.textContent || '{}') as { owner: Owner; contacts: Contact[] }) : null;
    const owner: Owner = data?.owner ?? { name: '', title: '', email: '', bio: '' };
    const contacts: Contact[] = data?.contacts ?? [];

    return {
      owner,
      contacts,
      // Open on the first connection — the page is about other people now; the
      // owner is only the intro target, never a selectable "About me" profile.
      selectedId: (contacts[0]?.id ?? null) as string | null,
      view: 'list' as 'list' | 'profile' | 'compose',
      fromName: '',
      fromEmail: '',
      message: '',

      init(this: NetworkPanel): void {
        const self = this as NetworkPanel & AlpineMagics;
        // Reset the form when the active profile changes, so a message meant
        // for one person can't be sent in another's context.
        self.$watch('selectedId', () => {
          self.fromName = '';
          self.fromEmail = '';
          self.message = '';
          if (self.view === 'compose') self.view = 'profile';
        });
      },

      get isContactSelected(): boolean {
        return this.selectedId !== null;
      },

      get activeProfile(): Profile {
        if (!this.selectedId) {
          return { name: owner.name, title: owner.title, blurb: owner.bio, isOwner: true };
        }
        const c = contacts.find((x) => x.id === this.selectedId);
        if (!c) return { name: owner.name, title: owner.title, blurb: owner.bio, isOwner: true };
        return { ...c, isOwner: false };
      },

      get isCompose(): boolean {
        return this.view === 'compose';
      },

      get composeReady(): boolean {
        return this.message.trim().length > 0;
      },

      get cta(): string {
        return this.isContactSelected
          ? `Request intro to ${this.activeProfile.name.split(' ')[0]}`
          : 'Get in touch';
      },

      get messagePlaceholder(): string {
        if (this.isContactSelected) {
          const ownerFirst = owner.name.split(' ')[0];
          const contactFirst = this.activeProfile.name.split(' ')[0];
          return `Tell ${ownerFirst} about the role and why ${contactFirst} would be a good fit.`;
        }
        return 'A few lines about why you are reaching out.';
      },

      get mailto(): string {
        const profile = this.activeProfile;
        const subject = this.isContactSelected
          ? `Intro request via your portfolio: ${profile.name}`
          : 'Hi from your portfolio';

        const bodyLines: string[] = [];
        bodyLines.push(`Hi ${owner.name.split(' ')[0]},`, '');
        if (this.isContactSelected) {
          bodyLines.push(
            `I came across your portfolio and would love an introduction to ${profile.name}` +
              (profile.company ? ` at ${profile.company}` : '') +
              '.',
            '',
          );
        }
        if (this.message.trim()) bodyLines.push(this.message.trim(), '');
        else bodyLines.push('[your message here]', '');
        bodyLines.push('Thanks,', this.fromName.trim() || '[your name]');
        if (this.fromEmail.trim()) bodyLines.push(this.fromEmail.trim());

        const body = bodyLines.join('\n');
        return (
          `mailto:${encodeURIComponent(owner.email)}` +
          `?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(body)}`
        );
      },

      get listPaneClass(): string {
        return this.view === 'list' ? 'block' : 'hidden lg:block';
      },
      get rightPaneClass(): string {
        return this.view === 'list' ? 'hidden lg:block' : 'block';
      },

      isMobile(): boolean {
        return window.matchMedia('(max-width: 1023px)').matches;
      },
      scrollToTopOfPanel(this: NetworkPanel): void {
        if (!this.isMobile()) return;
        const self = this as NetworkPanel & AlpineMagics;
        self.$nextTick(() => self.$root.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },

      selectContact(this: NetworkPanel, id: string): void {
        this.selectedId = id;
        this.view = 'profile';
        this.scrollToTopOfPanel();
      },
      selectOwner(this: NetworkPanel): void {
        this.selectedId = null;
        this.view = 'profile';
        this.scrollToTopOfPanel();
      },
      backToList(this: NetworkPanel): void {
        this.view = 'list';
        this.scrollToTopOfPanel();
      },
      openCompose(this: NetworkPanel): void {
        this.view = 'compose';
        this.scrollToTopOfPanel();
      },
      cancelCompose(this: NetworkPanel): void {
        this.view = 'profile';
        this.scrollToTopOfPanel();
      },
    };
  });
});

export {};
