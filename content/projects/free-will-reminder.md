---
title: 'Free Will Reminder'
tier: 1
summary: 'A silly little phone app for kids. A few times a week, at a random moment, it buzzes and reminds you that you have free will, then dares you to snap a photo or video of whatever you chose to do. Flutter for iOS and Android; built and tested on Android, not in either app store.'
tags: ['mobile', 'kids', 'notifications', 'flutter']
types: []
stack: ['Flutter', 'Dart', 'Riverpod', 'flutter_local_notifications', 'AdMob', 'In-App Purchase']
role: 'Solo build'
year: '2026'
status: 'in-progress'
cover: '/covers/free-will-reminder.webp'
featured: false
thoughts:
  - 'Every phone works out the same surprise schedule from the calendar alone. No server, so nothing to pay for and nothing to go down.'
  - "I wrote my own 15-line random number generator, because Dart doesn't promise its seeded one stays the same between versions."
  - 'The grown-up check before sharing is a times-table question spelled out in words. Easy for a parent, a real hurdle for a little kid.'
  - 'Blocking out class time only ever removes a buzz. It never moves one, or the whole class would get buzzed at different times.'
---

## Problem

Kids spend a lot of the day doing what they're told, and most of the rest doing what a feed suggests. Free Will Reminder is a joke with a point: every so often your phone goes off and says, more or less, *you have free will, go use it*. Then it dares you to prove it with a photo or a video.

It's meant to be silly, and the code is meant to be careful.

## Constraints

- **It's for kids.** That means the Apple Kids Category and Google Play's Families program, and their rules shaped the whole thing: child-directed ads only, no accounts, no analytics that collect personal details, and a grown-up check in front of purchases and anything that sends a child out of the app.
- **No server.** I wanted every kid in a class to get buzzed at the same moment, without running a backend to coordinate it.
- **It has to work with the app closed.** Phones kill background apps, so the reminders have to be scheduled with the operating system well ahead of time.

## How it works

The home screen is a wordmark, one big orange button and four round buttons along the bottom. There's almost nothing to read.

Two to five times a week, somewhere between 7am and 9pm, the phone plays a reminder sound. For the next hour the big button is live. Tap it, take a photo or a video of whatever you decided to do, and save it to the gallery or share it through the normal share sheet. The first save or share counts as your post for that reminder and pays points; once you've posted, the button greys out until the next one.

Kids can paint the half-hours they're happy to be buzzed on a weekly grid, save up to four day patterns with an emoji label, skip today, or switch on vacation mode. Points add up to badges such as a three-week streak. The notification sounds come in packs, with a free starter pack and more meant to be unlocked through in-app purchase.

## What I've built

- **One shared schedule with no server.** Each phone seeds a random generator from the ISO week, picks that week's reminder days and times, and gets the same answer as every other phone. The times come from the local calendar, so everyone in the same time zone gets buzzed at the same local minute. There's a schedule version baked in, so if the algorithm ever changes, every build moves to the new schedule together.
- **My own random generator.** The schedule uses a mulberry32 generator seeded through an FNV-1a hash, about 15 lines of Dart, because the seeded generator in Dart's standard library could change between Dart versions or platforms. Two phones disagreeing about today would break the whole idea.
- **Blocks that remove and never move.** A kid's time blocks are seven 48-bit masks, one bit per half-hour. A blocked slot only drops the reminder that lands in it; nothing gets re-picked, so a kid who blocks class time just sits that one out while everyone else stays in sync.
- **Calendar arithmetic around daylight saving.** Reminder times are built from calendar dates, not by adding durations, so a clock change doesn't shift a buzz by an hour or onto the wrong day. There's a test for the November 1, 2026 change in Los Angeles.
- **Scheduling two weeks ahead** with the operating system's local notifications, so the reminders fire even if the app never opens.
- **Kids-category plumbing.** Every ad request is marked child-directed, capped at a G rating and non-personalised. The grown-up check asks a multiplication problem spelled out in words and guards purchases and sharing.
- **A sound pipeline.** One script turns an mp3 into an Ogg file for Android and the in-app preview and a CAF file for iOS, which caps notification sounds at 30 seconds. Android notification channels can't change their sound after they're created, so new sounds get new ids instead of replacing old files.
- **Tests and screenshots without a simulator.** About 3,200 lines of Dart in the app and 32 tests, most of them on the scheduler: determinism, two to five reminders a week, one per day at most, blocks only removing, the one-hour live window and daylight saving. A screenshot test renders the real screens with the bundled fonts straight to PNG.

## Current state

The app runs on Android. I build a release APK with one `make` command and install it directly on a phone for testing. The iOS project is set up but I haven't put a build through Apple.

It isn't in the App Store or on Google Play. Before it can go to either, it needs the real notification sounds (a musician is making them; the sound packs are placeholders until then), its own AdMob account in place of Google's test ads, and the Families program forms.

## What I'd do differently

Get the sounds first. The whole app is built around a noise going off at a random moment, and I wrote the store, the packs and the conversion script before I had a single real sound to put in them.
