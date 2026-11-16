const COMMON = ['password', 'password1', '12345678', 'qwertyui', 'iloveyou', '11111111', 'abc12345', 'leyte123', 'souley123'];

// Advisory only. The server's rule is "8 characters or more"; this just nudges people toward better ones.
// Returns { score: 0-4, label }.
export function passwordStrength(pw = '') {
  if (!pw) return { score: 0, label: '' };
  if (COMMON.includes(pw.toLowerCase())) return { score: 1, label: 'Too common' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  else if (pw.length >= 16) score += 1;
  if (pw.length < 8) score = Math.min(score, 1);
  score = Math.max(1, Math.min(4, score));
  return { score, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}

export const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
