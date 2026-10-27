---
title: bof
difficulty: Toddler's Bottle
date: 2026-08-20
---

# bof
## Challenge: <https://pwnable.kr/play>

Hello Hackers!

Welcome back to another writeup from pwnable.kr
Today we'll be looking at bof

From the room name and hints, it seems to be of course, buffer overflow

Lets analyze the code

We find that we will get a shell if we execute the function with address **0xcafebabe** but the main function runs it as **0xdeadbeat**

Lets analyze the function

It is a 32 bit executable
Using cyclic to create

```bash
cyclic -n 4 200
```

Using pwndbg
Lets see what we find

Oops. forgot to **checksec**
Everything is protected

Trying to manually analyze the file using gdb
Break at func

When we disassemble the function, we find this

```asm
0x5655623c <+63>:	cmp    DWORD PTR [ebp+0x8],0xcafebabe
```

Hence, we can try to set the value of ebp+0x8 to be equivalent to 0xcafebabe

```bash
break 0x5655623c
```

Using python we find that **ebp+0x8** is **0xffffcb40**

```bash
set {int}0xffffcb40 = 3405691582
```

The int is the equivalent of 0xcafebabe

Continuing, we get our shell. 

But this is pretty much pointless. Because on the server, we cant run gdb as root
Hence we need to find smtg with the input that changes the value of ebp+0x8 to set 3405691582

When i input 400 A, we can see that 200 of them were stored at eax and the rest 200 at ebp
```bash
x $eax
x $ebp
```

Thus, our payload needs 208 A (The whole eax) and then 0xcodebabe

Ahh but we see that ebp still has a lot of A's 
Doing some math, we can find that sending 52 chars junk and then our addresss, we can get the flag

Writing exploit.py
We get flag:

> Daddy_******_buff3r!
