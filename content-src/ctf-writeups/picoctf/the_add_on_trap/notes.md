---
title: The Add/On Trap
difficulty: Medium
date: 2026-08-25
---

# The Add/On Trap
## Challenge: <https://learn.cylabacademy.org/library/697>

Hello Hackers!
Welcome back to another writeup, today we will be looking at `The Add/On Trap` from picoCTF (Reverse Engineering)

The file provided is a .xpi file and its supposedly a browser extension

--> We can unzip that too

We got more files

Upon inspection, we can find fernet is being used

From main.js we find

```js
// Secret key must be 32 url-safe base64-encoded bytes!
// TODO I must find a solution to remove the key from here, for now I'll leave it there because I need it to encrypt the webhook

function logOnCompleted(details) {
    console.log(`Information to exfiltrate: ${details.url}`);
    const key="cGljb0NURnt5b3UncmUgb24gdGhlIHJpZ2h0IHRyYX0="
    const webhookUrl='gAAAAABmfRjwFKUB-X3GBBqaN1tZYcPg5oLJVJ5XQHFogEgcRSxSis1e4qwicAKohmjqaD-QG8DIN5ie3uijCVAe3xiYmoEHlxATWUP3DC97R00Cgkw4f3HZKsP5xHewOqVPH8ap9FbE'
```

Hence we got the key and a string to decrypt
Using <https://asecuritysite.com/tokens/ferdecode>, 
We retrieve the flag

> picoCTF{...}
