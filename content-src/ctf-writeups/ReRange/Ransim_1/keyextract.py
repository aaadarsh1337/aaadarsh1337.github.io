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