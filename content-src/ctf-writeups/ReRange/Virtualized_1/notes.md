---
title: Virtualized 1
difficulty: Easy
date: 2026-09-28
---

# Virtualized 1
## Challenge: <https://rerange.org/challenges/>

Hello hackers! Welcome back to another writeup. Today we will be looking at something that is new to me as well. We will be reversing a VM to retrieve a flag. This is a challenge from ReRange. So lets begin. 

We download the elf file first and run it. It shows nothing interesting. It just says:

```text
VM execution finished.
```

Let's try to analyze the function using `Ghidra`.
We notice that the main function is smtg like this:

```c
undefined8 FUN_00101240(void)

{
  FUN_00101186(&DAT_00102020,0x54);
  puts("VM execution finished.");
  return 0;
}
```
This has reference to the output we recieved earlier. The interesting part here is the `FUN_00101186(&DAT_00102020,0x54);`
Lets analyse that. 

We can see from the `bytes` view that `&DAT_00102020` points to these bytes

```bytes
01 00 02 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 07 03 01 30 03 03 01 07 01 34 01 3b 03 01 32 01 30 03 03 01 2e 01 23 01 38 03 03 01 0a 01 60 03 01 21 01 34 01 21 01 66 03 03 03 01 0a 01 3b 03 01 65 01 62 01 0a 01 60 03 01 21 01 31 03 03 01 65 01 20 01 21 01 0a 03 03 01 31 01 60 01 03 37 01 28 00
```

Now lets look at what the function actually does. 

```c
void FUN_00101186(long param_1,ulong param_2)

{
  ulong uVar1;
  undefined1 local_118 [261];
  byte local_13;
  byte local_12;
  byte local_11;
  ulong local_10;
  
  FUN_00101139(local_118);
  local_10 = 0;
  uVar1 = local_10;
  while( true ) {
    do {
      local_10 = uVar1;
      if (param_2 <= local_10) {
        return;
      }
      uVar1 = local_10 + 1;
      local_11 = *(byte *)(local_10 + param_1);
    } while (local_11 == 3);
    if (3 < local_11) {
      return;
    }
    if (local_11 == 0) {
      return;
    }
    if (local_11 != 1) break;
    local_10 = local_10 + 2;
    local_12 = *(byte *)(uVar1 + param_1);
    local_13 = local_12 ^ 0x55;
    FUN_00101152(local_118,local_13);
    uVar1 = local_10;
  }
  return;
}
```

The function accepts our bytes and does some operations on it using the loops. The overall idea is that:
- If the byte is 0: skip
- If the byte is 1: skip (Move ahead by 2)
- If the byte is <= 3: skip
- All the other bytes are being XORed with `0x55`

The other function references just do checks of how many bytes to parse and clearing memory. Not very interesting for us. 

Let's write a solve script based on these conditions in python. 

1. `rawbytes` is a string that has all the bytes we have from the &DAT_00102020 reference. 
2. The bytes are split and converted to a format that python can properly work with
3. Then we run conditional checks that we discussed about. 
4. The rest of the bytes are XORed with `0x55`

```py
rawbytes = '01 00 02 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 07 03 01 30 03 03 01 07 01 34 01 3b 03 01 32 01 30 03 03 01 2e 01 23 01 38 03 03 01 0a 01 60 03 01 21 01 34 01 21 01 66 03 03 03 01 0a 01 3b 03 01 65 01 62 01 0a 01 60 03 01 21 01 31 03 03 01 65 01 20 01 21 01 0a 03 03 01 31 01 60 01 03 37 01 28 00'

bytelist = rawbytes.split()

for i in range(len(bytelist)):
  bytelist[i] = int(r'0x' + bytelist[i], 16)

for i in bytelist:
  if i == 1:
    continue
  if i == 0:
    continue
  if i <= 3:
    continue
  print(chr(i^0x55), end='')

print()
```

Running this solver, we retrieve our flag. 

> ReRange{***}

That is it for today's writeup. We learnt new concepts like bytecode, XOR, byte selection conditions, etc. 

I will see you soon with another writeup, until then, 

Happy Hacking!