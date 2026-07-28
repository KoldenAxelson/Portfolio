---
title: "Father's Puzzle"
description: "A 6x6 block puzzle. It has 36 numbered, colored blocks. Every row and every column must contain all six numbers and all six colors. This page shows why the puzzle has an answer, why it is difficult to solve by hand, and what happened when eight different methods were measured against each other."
lead: "Thirty-six blocks, six colors, six numbers, and 105,753,600 correct answers."
blurb: "A block puzzle, the 200-year-old problem it almost is, and eight attempts to solve it more quickly."
icon: "puzzle-piece"
prose: true
updated: 2026-07-28
---

<!-- WORKING DRAFT. Every number on this page is computed and checked.
     Voice: ASD-STE100 Simplified Technical English.
     PERSONALISATION STRIPPED at Konrad's request. -->

The puzzle has 36 wooden blocks. There are six blocks of each color. Each block
has a number from 1 to 6 on it.

The blocks go into a 6x6 tray. The tray is correct only when **every row and
every column contains all six numbers and all six colors**.

Try it before you read further. Click a block, then click a square. The two
buttons solve it for you, quickly or slowly.

{{< puzzle-solver >}}

Now look at the box below the board. The box is more important than the board.
Orange has the numbers 1, 1, 3, 3, 6 and 6. Orange has no 2, no 4 and no 5.
Green has three 5s. Each color still has six blocks, and each number still
occurs six times. But the box holds more than one of some blocks, and none of
others.

That imbalance is not a defect. It is the reason the puzzle has an answer at
all. The next section shows why.

## Part one: the problem it almost is

Euler wrote about a related problem in 1782. Six regiments each send six
officers. Each officer has a different rank. Put the 36 officers in a 6x6
square. Each row and each column must contain one officer of each rank. Each row
and each column must also contain one officer from each regiment. Is this
possible?

Replace "regiment" with "color" and "rank" with "number". That is this puzzle,
with one difference. Euler's officers include each combination one time only.
There are no duplicates and no gaps.

{{< puzzle-boxes >}}

Euler could not solve his version. He decided that nobody could solve it. He
believed that it is impossible for 6, 10, 14, and every size of the form 4k+2.
He was correct about 6. He was wrong about the larger sizes.

The proof took 118 years. In 1900 Gaston Tarry showed that no answer exists. He
did the work by hand, not with a computer. One fact made the work possible. If
you move two whole rows, or two whole columns, a correct square stays correct.
So Tarry examined one square from each family instead of all of them. This
reduced 812,851,200 squares to **9,408** cases.

Remember that number.

Bose, Shrikhande and Parker disproved the wider belief in 1959. They built
answers for size 10, and then for every size larger than 6. **Only 2 and 6 have
no answer.** Euler asked about one of the two sizes that do not work.

## Part two: why this box has an answer

Euler's square is impossible. This box is the same puzzle. So the difference
between them must be doing the work, and the difference is the duplicates.

Twelve of the 36 possible number-and-color combinations do not exist in this
box. There is no yellow 1 and no orange 2. This is why 36 blocks give only 24
different kinds of block. The twelve gaps are paid for by twelve duplicates.

That exchange is what buys the answer. In Euler's version each combination
exists one time. When you put a block down, that combination is gone from the
whole square forever. Each placement removes an option from all 36 squares. In
this box a placement often removes nothing. Put down a green 5, and two green 5s
remain in the box for other rows to use.

Euler's version is rigid because every block is unique. This box is loose
because most blocks are not.

Each row holds all six colors in six squares, so each row holds exactly one
block of each color. The same is true of each column. Each color therefore makes
a pattern that touches each row one time and each column one time. Lay the
colors down one at a time and you can see it happen.

{{< puzzle-build >}}

## Part three: how many answers there are

A computer must be able to take a block back as well as put one down. This is
where an earlier version of this program failed. It removed choices as it went
forward, but it did not restore them when it went backward. The list of choices
became smaller and smaller. In the end the program reported that the puzzle has
no answer.

It has rather more than that.

### Rows and columns move freely

{{< puzzle-swap >}}

This is Tarry's fact, shown directly. Move two whole rows and the board stays
correct. Move two whole columns and it stays correct. Move two single blocks and
it usually breaks, and the squares at fault turn red.

Each answer has 6! x 6! = **518,400** arrangements, and every one of them is a
different board. Remove that freedom and **204 different answers** remain.

Multiply the two numbers together:

**204 x 518,400 = 105,753,600 correct boards.**

Every solver on this page uses Tarry's fact before it starts, not after. It
fixes the first row and the first column to the numbers 1 to 6. Every answer has
an arrangement in this form, so nothing is lost. This one step makes the search
**80 times** faster.

### 72 patterns out of 9,408

Ignore the colors and look at the numbers only. The numbers form a Latin square.
Put the rows and columns in order, and the result is one of the 9,408 reduced
Latin squares of size 6. These are Tarry's 9,408 cases.

This box can produce **72** of them. The other 9,336 are correct Latin squares,
but this box cannot color them. The most regular square of all is one of the
9,336:

{{< puzzle-grid rows="123456,234561,345612,456123,561234,612345" label="A cyclic Latin square: each row is the row above it, moved one place to the left" >}}

No answer from this box reduces to it, and renumbering the blocks does not
change that. A box with 24 kinds of block can reach 72 of the 9,408 patterns.
The twelve combinations the maker left out decide which 72 it reaches.

### The box has a mirror

Exchange blue with purple, and green with yellow. Then exchange the number 1
with 3, and 2 with 5. Leave orange, red, 4 and 6 alone. Do all of it at the same
time, and the box becomes itself again.

{{< puzzle-mirror >}}

Each answer therefore has a twin. A test of all 204 answers gives the same
result each time. Each mirror image is a correct board, and no answer is its own
mirror. The answers form **102 pairs**, with none left over.

This looks like a signature from the person who designed the box. The numbers do
not support that. 2,000 random boxes were built for comparison, and **10.9% of
them had a symmetry of their own**. Some had more symmetries than this box. A
box of duplicates is simply a likely place for a symmetry to appear.

## Part four: why it is difficult by hand

The puzzle is not a Sudoku. In a Sudoku you find a square that has one possible
answer, and you write it in. Here that method does not work at all.

A check of all 204 answers, square by square, shows one thing clearly. **No
square holds the same color in every answer.** There is no first move that you
must make. There is no square that you can complete by elimination. More than a
hundred million boards are correct, and the puzzle forces none of them.

So you must build an answer instead of deducing one. The difficulty is that the
box gives you no way to judge a move when you make it.

### Legal moves that lead nowhere

Fill one row on its own. There are 76 ways to do this. Only **44** of those 76
rows occur in a complete answer. This row is one of the other 32:

{{< puzzle-blocks blocks="1 orange, 2 blue, 4 green, 3 red, 6 yellow, 5 purple" label="A legal row that is in no answer" >}}

Nothing is wrong with it. Every block exists. No number repeats and no color
repeats. But no complete board contains it.

The same trap occurs at the next level up. Six rows must use every block in the
box. There are **948** ways to choose six different rows that do this. Only
**16** of them will go together into a board. **98.3% of the choices that look
correct cannot be built.**

### Why you cannot see the difference

A method that a person can use must be cheap. Three cheap tests exist. All three
fail on this box.

The first is a counting test. It asks whether a row can belong to a set of six
rows that empties the box. This takes 13 milliseconds for all 76 rows. All 76
rows pass. It rejects nothing.

The second is a parity test. Each row is a permutation, so each row is odd or
even. The 44 good rows divide 18 to 26. The 32 bad rows divide 18 to 14. The two
groups look the same.

The third is the support test, and it is the rule that helps a computer most
during a search. Put the row down and ask whether every number and every color
the board still needs has a square left that can hold it. Applied to a single
row, it also rejects 0 of the 76. One row is far too little information for it
to bite.

The only test that works is to try to complete the board. To show that one row
is bad takes about **5,791 block placements**. To solve the whole puzzle takes
5,508. It costs more to reject one row than to finish the puzzle.

This is why the puzzle is difficult by hand. A bad row and a good row look the
same. The board tells you nothing until you are deep into it, and then you must
go back a long way. Trial and error is not a weak method here. At present it is
the only method.

### What does help

Two habits reduce the wasted effort. Neither removes it.

Ask the opposite question. Do not ask which blocks fit on this square. Ask
whether each number and each color that the row still needs has a square left
that can hold it. If a row needs a 5, and no empty square in that row can hold a
5, the board is already dead. Go back at once. Examine only the row and the
column that you have just used. This is 12 squares. A computer that uses this
one rule does 73% less work.

Keep red until last. Red carries five of the six numbers. It has everything
except 4. Orange carries only three. A block that fits in many places is the
best block to hold while the board is still open.

## Part five: how a computer solves it

Latin squares fill many mathematics books. This box appears in none of them, so
there is no published advice to follow. Eight methods ran on it instead. Each
one produced a correct board.

The result worth watching for is in the last two rows. The rule a person can
hold in their head is also the rule the computer should use.

| method | blocks placed | time |
|---|---|---|
| A. most restricted square first | 20,332 | 40.5 ms |
| B. A, plus least restrictive block first | 32,460 | 177 ms |
| C. A, plus a full match test on each line | 14,514 | 261 ms |
| D. A, plus both B and C | 24,074 | 348 ms |
| E. fill one whole row at a time | 309,360 | 296 ms |
| F. start again from random points | ~32,288 | 58 ms |
| G. A, plus check all 12 lines for stranded values | 4,012 | 28.6 ms |
| **H. A, plus check only the row and column just used** | **5,508** | **22.7 ms** |

Method B is the usual advice in textbooks. Here it made the work **60% worse**.
Published comparisons use empty Latin squares. The duplicates in this box change
the problem enough to reverse the result.

Compare G and H. The wide test places the fewest blocks of any method. The
narrow test places more blocks and is still faster. The extra dead ends that the
wide test finds cost more to look for than they save. No other method tested was
better in both measures.

### Why the list of good rows does not help

You can find the 44 good rows in two ways. You can find all 204 answers and
collect their rows. This takes 7.9 seconds, and it is circular, because you need
every answer first. Or you can put each row on the board and try to finish the rest. This takes 76 attempts and about 2 seconds, and it gives
the same 44 rows.

Solving the puzzle once takes method H about 23 milliseconds. Learning which
rows are good costs about **90 times** more than solving the puzzle. The list is
a true fact about the box. It is of no use as a method.

### The methods are not tuned to this box

A method tuned against one puzzle can hide the answers to that puzzle. A test for this uses 200 new boxes. Each new box comes from two random
Latin squares, put one on top of the other. This guarantees that an answer
exists, but it gives no information about where the answer is.

| method | solved | average blocks placed | average time |
|---|---|---|---|
| A. basic method | 200/200 | 58,986 | 118 ms |
| G. check all 12 lines | 200/200 | 9,675 | 65 ms |
| **H. check the row and column just used** | **200/200** | **13,021** | **53 ms** |

The order of the methods is the same on the new boxes. The result 200 out of 200
also proves something else. The support test could in theory remove the branch
that holds the only answer. A box with a known answer would then report that it
has none. This did not happen.

Two conditions apply to all of this work. The board is always 6x6. And every
method uses Tarry's fact, which is 126 years old and is not something learned
from this box.

The 200 new boxes need about three times more work than this box. This box is an
easy member of its family.

The maker left out twelve combinations and put twelve duplicates in their place.
That one choice decides everything on this page. It gives the puzzle an answer
where Euler's version has none. It gives it 105,753,600 answers. It also leaves
32 legal rows that lead nowhere, and no cheap way to tell them apart.
