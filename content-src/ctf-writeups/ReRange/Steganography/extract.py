def steg_rev(num_bits):
	secretsize = 64
	secretsizebits = secretsize * 8
	carrier = ((secretsizebits + num_bits) - 1) // num_bits

	key = b'stegosaurus'

	buffer = bytearray(open('steg_embed/embedded_tiger.bmp', 'rb').read())

	bytelen = len(buffer)
	carrier = int.from_bytes(buffer[6:10], "little")
	index_array = Fisher_Yates_Shuffle(key, carrier, bytelen)

	secret = bytearray(secretsize)

	local_10 = 0

	for i in range(carrier):
		local_19 = buffer[index_array[i]]
		for j in range(num_bits):
			if local_10 < secretsizebits:
				local_98 = local_10 >> 3
				local_9c = ~local_10 & 7
				local_21 = (local_19 >> (j & 0x1F)) & 1
				secret[local_98] |= local_21 << local_9c
			local_10 += 1

	print(secret.decode())


def key_manipulation(key):
	initial = 0xcbf29ce484222325
	for i in key:
		initial = ((initial ^ i) * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
	return initial

def Fisher_Yates_Shuffle(key, carrier, bytelen):
	local_28 = []

	for i in range(bytelen - 0x36):
		local_28.append(0x36 + i)

	local_40 = key_manipulation(key)

	index_array = []

	for i in range(carrier):
		index_array.append(0)
	
	for i in range(carrier):
		local_30, local_40 = Linear_Congruential_Generator(local_40, i, bytelen)
		swap_target = i + local_30
		local_28[i], local_28[swap_target] = local_28[swap_target], local_28[i]
		index_array[i] = local_28[i]

	return index_array

def Linear_Congruential_Generator(initial, i, bytelen):
	  initial = (initial * 0x5851f42d4c957f2d + 1) & 0xFFFFFFFFFFFFFFFF
	  if bytelen - 0x36 - i == 0:
	  	uVar1 = 0
	  else:
	  	uVar1 = initial % (bytelen - 0x36 - i)
	  return uVar1, initial

steg_rev(1)