---
title: collision
difficulty: Toddler's Bottle
date: 2026-08-23
---

# collision
## Challenge: <https://pwnable.kr/play>

Hello Hackers!
Welcome back to another writeup 
Today we will be doing **collision** from pwnable.kr

Downloading all the files locally, 

Reading the source code, there is a comparison

The return value of **check_password()** must be equal to hashcode, ie, **0x21DD09EC**

From gdb, breaking at check_password() and setting eax = 568134124 (int of hashcode), we get 

Analyzing the funcction, we realise that our 20 byte input is being divided into 5 parts of 4 bytes each.
Sum of these should be equal to 568134124

Therefore, divide 568134124 by 5

We get **113626824**
And remainder is 4

Therefore, the first four chunks will become 113626824 and the last will be 568134124-113626824*4 = 113626828

Taking hex values, 

> 0x6c5cec8 *4 + 0x6c5cecc

Passing values using pwntools, writing exploit

We obtain the flag from the remote host

> Two_********_Nicely
