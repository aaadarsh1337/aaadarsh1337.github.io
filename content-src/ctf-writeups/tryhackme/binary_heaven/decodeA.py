string = 'kym~humr'
l = []
for char in string:
    res = chr((ord(char) ^ 4) - 8)
    l.append(res)

print(''.join(l))
