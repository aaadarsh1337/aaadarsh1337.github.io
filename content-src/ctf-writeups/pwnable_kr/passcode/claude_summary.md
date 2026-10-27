```md
I had to learn a lot of new concepts for this challenge.
I used Claude to get explanations for the concepts
Below attached is the summary of what the working of the exploit is
The biggest issue was not using & and using initialised variables

NOTE: Addresses are NOT same because i didn't use claude for solution. It is just a general explanation of the challenge
```

```txt
Let's trace this as one continuous timeline, with actual memory contents at each step, so there's no ambiguity about what "then" means.

**Setup — the addresses we're using (from the actual binary)**
- `0x0804a004` = the GOT slot for `fflush` (a fixed spot in memory)
- `0x080485e3` = address inside `login()`, right before `system("/bin/cat flag")`

---

**Step 1 — `welcome()` runs**

You send: `'A'*96 + p32(0x0804a004)`

This fills the `name` buffer. The last 4 bytes of your input (`0x0804a004`) land on memory that *will become* `passcode1`'s slot once `login()` starts (because of the frame-overlap thing we covered).

Memory at that address right now: `0x0804a004`

**Step 2 — `welcome()` returns, `login()` starts**

`login()` declares `int passcode1;` — uninitialized, meaning: whatever is already sitting in that memory slot becomes its starting value.

`passcode1`'s value right now = `0x0804a004` (leftover from step 1)

**Step 3 — the buggy line runs: `scanf("%d", passcode1);`**

This is where you're stuck, so slow down here:

- The program prints `"enter passcode1 : "`
- **You type a number** — let's say you type `134514147` (which is `0x080485e3` in decimal)
- scanf reads that typed number and needs to know *where to store it*
- Because of the missing `&`, scanf is told "store it at `passcode1`'s **value**" — i.e., store it at `0x0804a004`
- scanf writes `0x080485e3` into memory address `0x0804a004`

**This is the single write.** Nothing happens *during* this — the write just silently overwrites whatever was in `0x0804a004`.

Memory at `0x0804a004` right now: it *used to* hold `fflush`'s real address (something in libc). **Now it holds `0x080485e3` instead.** GOT entry for fflush is now poisoned.

**Step 4 — program keeps running normally, nothing special happens yet**
```
```c
scanf("%d", passcode1);   // just finished, did the write above
fflush(stdin);            // <-- next line, about to run
```
```txt
The very next line in the source is `fflush(stdin);`. This is a completely ordinary function call — the program isn't "aware" anything went wrong. It's just continuing execution top to bottom like normal.

**Step 5 — `fflush(stdin)` executes**

Here's the key mechanical fact: `fflush(stdin)` doesn't contain fflush's code directly inside `login()`. It's a call to an *external* library function, so it goes through the GOT:
```
```
call fflush@plt   →   internally does   →   jmp [0x0804a004]
```
````txt
Meaning: "go to address `0x0804a004`, read the 4 bytes stored there, and jump to *that* address."

- CPU reads `0x0804a004` → finds `0x080485e3` (your write from Step 3)
- CPU sets the instruction pointer (EIP) to `0x080485e3`
- Execution jumps there — **not into fflush's real code**, but into the middle of `login()`, right at the `system("/bin/cat flag")` line

**Step 6 — flag prints**

Execution is now physically inside `login()`'s flag-printing code, having skipped the `if (passcode1==338150 ...)` check entirely — because you never went *through* that check, you jumped straight past it via the hijacked fflush call.

---

**So, answering "what happened after that" directly:** after scanf wrote your address into the GOT slot, **nothing happened immediately** — the write itself is silent. The consequence only shows up one line later, when the program's normal, unmodified control flow reaches `fflush(stdin);` and tries to call it — at which point it reads the (now poisoned) GOT entry and jumps to your address instead of into fflush. The exploit isn't "the write triggers something" — it's "the write plants a landmine that the *next legitimate call to fflush* steps on."
```
