---
title: 'Harmony Pulse'
tier: 1
summary: 'An iPhone and Apple Watch app that coaches horse riders from two heart-rate straps, one on the horse and one on the rider. It speaks short cues during the ride and writes a debrief and a trainer report afterwards. All of it runs on the phone with no internet, because barns rarely have any. Built for one rider: my mom.'
tags: ['ios', 'wearables', 'coaching']
types: []
stack: ['Swift', 'SwiftUI', 'Core Bluetooth', 'HealthKit', 'watchOS', 'Apple Intelligence']
role: 'Designer · engineer'
year: '2026'
status: 'in-progress'
links:
  showcase: '/misc/harmony-pulse/'
cover: '/covers/harmony-pulse.webp'
featured: true
thoughts:
  - 'My client is my mother, so the feedback is fast and honest.'
  - 'Ranch wifi is terrible, so the whole app works with no signal. Even the AI debrief is written on the phone.'
  - 'The coach never calls an AI model during a ride. Rules decide when it speaks and a person wrote every line, so it has nothing to make up.'
  - 'Every sensor byte is saved before anything decodes it. When I fix a bug in how a gait is read, every ride she has recorded gets fixed with it.'
  - 'A resting horse sits around 36 beats a minute, so any human sanity filter on a heart rate is wrong for half of my users.'
---

## Problem

A rider gets one or two coached lessons a week and rides alone the rest of the
time. Those solo rides have no feedback at all. Nothing speaks up in the moment,
and afterwards the only record is how it felt.

Harmony Pulse gives those rides a voice and a record. Two chest straps, one on
the horse's girth and one on the rider, feed an iPhone in her pocket. During the
ride it speaks short cues about rhythm, breathing and how hard the horse is
working. Afterwards it grades the session, writes a debrief, and produces a
one-file report her trainer can read before the next lesson.

The rider is my mom, Kirstin. She has two horses, Bowie and Denali, and she's
the domain expert and the first tester.
<a href="/misc/harmony-pulse/" hx-boost="false">The showcase page</a> is the
version she shows people. This page covers how it's built.

## Constraints

- **Ranches have terrible wifi and worse cell service.** So nothing in the app
  can need the internet. Recording, coaching, grading and the AI debrief all run
  on the phone, and there's no account, no cloud and no subscription.
- **No commercial horse sensor will share its data.** Every one I looked at is
  a closed ecosystem with no API. The horse wears the same off-the-shelf Polar
  H10 the rider does, talked to over plain Bluetooth with no vendor SDK, and
  its accelerometer on the girth is the gait sensor.
- **It talks into someone's ear while she's on a horse.** A cue that's late,
  wrong or chatty is worse than silence, so the live path has to be boring and
  predictable.
- **Two heart straps can't diagnose anything.** The app compares a horse only
  to his own recent history and never names a limb. That rule is written down
  and tested.

## How it works

I built the recorder first and the analysis second, and most of the design
follows from that order.

Every byte from every sensor is written to disk as it arrives, before anything
decodes it. A recorded ride and a live ride then go through the same code. Below
one seam the app can't tell a real strap from a replayed file or a simulated
horse, and the analysis is deterministic, with no clock reads and no randomness.
Replay a ride twice and the event log matches byte for byte. A decoder fix
therefore repairs every ride ever recorded, and the whole pipeline, from sensor
frames to spoken cues to the trainer report, runs at a desk with no hardware and
no horse.

The coach sits on top of that. Ten times a second it updates what it knows about
gait, stride rhythm, transitions, the horse's effort and recovery, and the
rider's breathing and heart rhythm. Detectors turn changes into events, and a
cue policy decides which events are worth her attention. Most aren't. The sample
ride on the showcase noticed 28 moments and spoke about six. The words come from
a phrase bank written by hand and recorded in two voices, and the recordings
ship inside the app.

AI is used only after the ride, and only to write prose. The session is
summarised into numbers in Swift, Apple Intelligence rewrites those numbers as a
debrief on the device, and a deterministic honesty check reads the result before
she does. If the model isn't available, or it says something the numbers don't
support, she gets a plain structured debrief built from the same numbers.

## What I've built

- A Swift package that holds all the logic and depends only on Foundation, so
  it builds and tests on Linux in CI. It has more than 500 tests, including a golden event
  log that fails the build when a change moves a single cue.
- The iPhone app in SwiftUI: pairing, the live ride screen, the report card,
  heart-rate charts, a route map, session history, and a trainer report
  exported as one HTML file.
- An Apple Watch app that owns the workout session and gives her a Log button
  and press-and-hold voice notes, so she doesn't have to reach for the phone.
- Quests, which are short scripted sessions where the coach tells her what to
  do and when. She gets a guided exercise and I get labelled data, so a change
  to the gait or breath detection can finally be judged by a number.
- A set of decision records. A lot of the interesting choices were things I
  decided to leave out.

## Current state

It's in testing with one rider and two horses. She sends real
sessions from the barn, and the work has moved from building to tuning, which means
checking that what the app reads is what happened.

Gait at walk and trot was retuned on real strap data, and the rider's calm
reading was checked against an open breathing dataset. Other readings aren't
there yet. Canter has the least real data behind it, transitions are unvalidated, and
the breath-hold detector flags far too often, so that one gets fixed first.

There's no launch date and no business plan. The goal is to make it everything
she wants it to be. Her next idea is a coach that keeps what her trainer said
in a lesson and turns it into a plan for the week.
