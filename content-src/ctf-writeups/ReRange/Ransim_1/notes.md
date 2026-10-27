---
title: Ransim 1
difficulty: Medium
date: 2026-10-14
---

# Ransim 1
## Challenge: <https://rerange.org/challenges/>

Hello Hackers!

Welcome back to another writeup. Today we will be looking at 'Ransim 1' from ReRange.

> Reverse this ransomware sim and derive the key for the decryptor. Use it to decrypt the flag file.

Seems clear enough. 

When we download the files, we get a .zip file that contains:

- ransim_1
- decryptor.py
- readme.txt
- flag.txt.locked

So what we need to do is extract the key from `ransim_1` and provide that key to `decryptor.py` along with `flag.txt.locked`
The syntax has been provided in the .py file.

```bash
Usage:
  pip3 install pycryptodome
  python3 decryptor.py --key <64-hex-or-32-ascii> --file ./ctf_sandbox/flag.txt.locked
```

Running `file` on the binary, we see it is a

```bash
ransim_1: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=c6293ae44e95b1ccfddc159ad77092378b2088b1, for GNU/Linux 3.2.0, stripped
```

Running `strings` on it, the only interesting strings we find are:

```text
ctf_sandbox
ctf_sandbox/flag.txt
ctf_sandbox/flag.txt.locked
err: cannot open %s: %s
random fail
err create %s: %s
created %s
```

Let's fire up `ghidra` and see whats happening. 

Okay so we can clearly see the keygen logic in the decompiled code. 

Let's write a mirror in python. 

Some key notes:
- It uses 'ctf-sandbox' as one of the parameters for the keygen, which many people might ignore as it is the directory name as well
- The math is pretty straight forward which can directly be taken line by line from the decompiled code
- Use `0xffffffff` for C to python memory conversion issues

keyextractor.py:

```py
local_c = 0;
local_18 = 0
param_1 = "ctf_sandbox"

while local_18 < len(param_1):
  local_c = local_c + int(ord(param_1[local_18]))
  local_18 += 1


local_34 = local_c + 0x1a2b3c4d;
uVar1 = 2780222772
local_34 = local_34 ^ uVar1;
local_1c = local_34;

local_2c = 0
local_28 = ['a']*32

while local_2c < 32:
  local_3c = (local_1c * 0x41c64e6d + 0x3039) & 0xffffffff
  local_1c = local_3c
  local_28[local_2c] = (local_3c >> 0x18) & 0xff
  local_28[local_2c+1] = (local_3c >> 0x10) & 0xff
  local_28[local_2c+2] = (local_3c >> 8) & 0xff
  local_28[local_2c+3] = local_3c & 0xff
  local_2c += 4

param_2 = ['a']*0x20
local_30 = 0

while local_30 < 0x20:
  param_2[local_30] = (local_28[local_30] ^ (uVar1 >> ((local_30 & 3) << 3))) & 0xff
  local_30 += 1

print(bytes(param_2).hex())
```

Running the script gives us the hex key we need. Now running

```bash
python3 decryptor.py --key <4e9b5bWorkForItLol30021> --file ./ctf-sandbox/flag.txt.locked
```

Creates a file flag.txt which contains our flag :))

> ReRange{...}

This was a very interesting challenge since it had elements of cryptography and also showcased the working of a ransomware. This was not too bad and took me about 1 hour to document everything and reverse the binary itself. Overall, a medium-high difficulty challenge that was fun to take a shot at. 

I will see you with another writeup soon, until then, 

Happy Hacking!