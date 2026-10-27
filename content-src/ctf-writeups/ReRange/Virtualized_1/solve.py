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