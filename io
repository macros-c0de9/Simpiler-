def io(a,b):
	if a== 'o':
		print(b)
	if a=='i':
		if b==0:
			return input()
		else:
			return input(b)
	if a!='i' and a!='o':
		print("error")