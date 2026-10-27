---
title: Virtualized 2
difficulty: Medium
date: 2026-10-13
---

# Virtualized 2

## Challenge: <https://rerange.org/challenges/>

Hello Hacker!

Welcome back to another writeup. Today we will be looking at this challenge from ReRange. It is a medium difficulty challenge and it is based on reversing VMs. This should be interesting. I have already covered Virtualized 1 in my previous writeup, do check that out too. 

```
Understand the instruction set this VM uses to recover the flag. Fake instructions, misleading state changes, and a shifting key. 
```

The interesting part is, today I am not using my main system, which is linux. 
So today, we will be reversing the `.exe` version of the binary from my windows system using `Ghidra`. Lets begin. 
With initial analysis using `DIE` we can observe that this was written in `C++` and is a `PE64` file. 
When we run the binary, it shows us a message on screen. 

```
VM execution finished/n
```
Let's fire up Ghidra and look at what's going on. 
We see an interesting line of code
```c
uVar8 = FUN_140001883();
```

We found our main VM function:

```c
undefined8 FUN_140001883(void)

{
  undefined8 uVar1;
  undefined8 *puVar2;
  undefined8 in_R9;
  undefined8 local_118 [34];
  
  FUN_140001980();
  puVar2 = local_118;
  uVar1 = 0x79;
  FUN_14000152e(0x140004000,0x79,puVar2);
  FUN_1400029c0("VM execution finished/n",uVar1,puVar2,in_R9);
  return 0;
}
```

```c
void FUN_14000152e(longlong param_1,ulonglong param_2,undefined8 *param_3)

{
```

It is pretty obvious that the bytes we need live at `0x140004000`    
On further analysis, the behavious of the VM becomes clear. 
It has behavioural patterns for opcodes 0, 1, 3 and 7. 
Lets write a python script to reverse the bytes.

```py
ops = "07 bc 01 0e 07 56 01 d0 07 5d 07 4f 01 c7 07 35 07 de 01 03 03 01 60 07 82 07 5a 01 13 03 07 50 01 2a 01 21 07 76 01 3a 07 cc 01 1e 07 ec 01 c9 07 ce 03 01 68 01 6a 01 27 01 6c 07 e7 07 ad 01 c3 01 f9 03 01 59 03 01 09 03 01 9f 03 01 32 03 01 95 07 37 01 39 03 01 17 07 0d 01 85 07 96 03 01 bc 01 e5 03 07 ef 01 c7 07 cd 01 75 03 01 ba 07 e8 01 d2 03 01 a4 03 00"
ops = ops.split()

seed = 0xc3
i = 0

while i < 0x79:
	op = int(ops[i], 16)

	if op == 3:
		seed = (seed ^ 0x11) & 0xff
		i += 1

	elif op == 0:
		break

	elif op == 7:
		seed = (seed + int(ops[i+1], 16)) & 0xff
		i += 2

	elif op == 1:
		ans = (int(ops[i+1], 16) ^ (seed >> (8 - (3 & 7) & 0x1f) | seed << (3 & 7)) ^ 0xffffffa7) & 0xff
		seed = (ans + seed ^ 0x3d) & 0xff
		i += 2
		print(chr(ans), end = '')
```
Here, `& 0xff` is used because in python, integers can grow infinitely unlike in C. Thus the output will differ if we dont use it. 

Running the script, we obtain our flag:

> ReRange{***}

That was a pretty fun challenge. I am still figuring out my way with VM reversing and so far it has been a great learning experience. So thats all for this writeup, I will see you soon with another one. Until then, 

Happy Hacking!