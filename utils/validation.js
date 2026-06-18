// Input Validation & Sanitization Utilities

const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
    maxLength: 254
  },
  password: {
    minLength: 8,
    message: 'Password must be at least 8 characters long',
    maxLength: 128
  },
  eventName: {
    minLength: 1,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-&().,]+$/,
    message: 'Event name contains invalid characters'
  },
  rollNumber: {
    pattern: /^[A-Z]{2,5}\d{3}$/,
    message: 'Format: BRANCH + 3 digits (e.g. CSE042)'
  },
  eventPassword: {
    minLength: 6,
    maxLength: 128,
    message: 'Password must be 6-128 characters'
  }
};

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const rule = VALIDATION_RULES.email;
  if (email.length > rule.maxLength) return false;
  return rule.pattern.test(email.trim());
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  const rule = VALIDATION_RULES.password;
  return password.length >= rule.minLength && password.length <= rule.maxLength;
}

function validateEventName(name) {
  if (!name || typeof name !== 'string') return false;
  const rule = VALIDATION_RULES.eventName;
  const trimmed = name.trim();
  if (trimmed.length < rule.minLength || trimmed.length > rule.maxLength) return false;
  return rule.pattern.test(trimmed);
}

function validateRollNumber(roll) {
  if (!roll || typeof roll !== 'string') return false;
  const rule = VALIDATION_RULES.rollNumber;
  return rule.pattern.test(roll.trim().toUpperCase());
}

function validateEventPassword(password) {
  if (!password || typeof password !== 'string') return false;
  const rule = VALIDATION_RULES.eventPassword;
  return password.length >= rule.minLength && password.length <= rule.maxLength;
}

function sanitizeInput(input, type = 'text') {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remove potential XSS patterns
  sanitized = sanitized
    .replace(/[<>\"']/g, match => ({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }[match]));

  // Type-specific sanitization
  if (type === 'email') {
    sanitized = sanitized.toLowerCase();
  } else if (type === 'rollNumber') {
    sanitized = sanitized.toUpperCase();
  }

  return sanitized;
}

function validateFileSize(file, maxSizeMB = 5) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file && file.size <= maxBytes;
}

function getFileSizeReadable(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getPasswordStrength(password) {
  let strength = 0;
  if (!password) return { score: 0, label: 'None', color: 'var(--muted)' };

  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*]/.test(password)) strength += 1;

  const levels = [
    { score: 0, label: 'None', color: 'var(--muted)' },
    { score: 1, label: 'Weak', color: 'var(--danger)' },
    { score: 2, label: 'Fair', color: '#ff9800' },
    { score: 3, label: 'Good', color: 'var(--accent2)' },
    { score: 4, label: 'Strong', color: 'var(--success)' }
  ];

  return levels[Math.min(strength, 4)];
}
