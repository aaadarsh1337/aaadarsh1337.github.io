---
title: tea-cash
difficulty: Medium
date: 2026-08-20
---

# tea-cash
## Challenge: <https://learn.cylabacademy.org/library/746>

Hello Hackers!
Welcome to my writeup on the challenge `tea-cash` from picoCTF
It is a medium challenge and in the category Binary Exploitation

Downloading all the files, theres a libc.so.6 files

For some reason, i cannot run the binary but it doesnt matter
We have the source and also the service to connect to

Reading the source code, 
User has to input an address, stored in the variable `expected`

```c
#define CHUNK_COUNT 6
#define CHUNK_SIZE 0x80 
```
--> The user input check runs 6 times
--> Chunk size is set to 0x80

Reading about heap exploitation and tcache, we find

> Each thread gets its own TCACHE, hence the name “Thread-Local Cache”. It is used for quick allocation and deallocation of heap chunks during program execution. On a 64-bit system, the TCACHE is used for allocation sizes between the sizes of 16 bytes and 1024 bytes (excluding metadata) incrementing in 16-byte chunks (the minimum difference in allocation sizes). This leads a total of 64 TCACHE bins per program thread.

Increment of 16 bytes, ie, headers of size 0x10 are present in between the freed chunk and the malloc chun
ie, total diff = CHUNK_SIZE + 0x90

So with our chunksize and increment, each new pointer should be 0x90 more than the previous one
Writing the exploit using pwntools, 

We get the flag:

> picoCTF{...}
