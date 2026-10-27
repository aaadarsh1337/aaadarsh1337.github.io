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