/**
 * Form Validation Utilities
 * For ChainTrust pharmaceutical verification system
 */

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  return { isValid: true }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean
  strength: 'weak' | 'medium' | 'strong'
  errors: string[]
} {
  const errors: string[] = []

  if (!password) {
    errors.push('Password is required')
    return { isValid: false, strength: 'weak', errors }
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (password.length >= 12 && errors.length <= 2) strength = 'medium'
  if (password.length >= 16 && errors.length === 0) strength = 'strong'

  return {
    isValid: errors.length === 0,
    strength,
    errors,
  }
}

/**
 * Validate name
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' }
  }

  if (name.length > 100) {
    return { isValid: false, error: 'Name must not exceed 100 characters' }
  }

  return { isValid: true }
}

/**
 * Validate company name
 */
export function validateCompanyName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: 'Company name is required' }
  }

  if (name.length > 150) {
    return { isValid: false, error: 'Company name must not exceed 150 characters' }
  }

  return { isValid: true }
}

/**
 * Validate batch ID
 */
export function validateBatchId(batchId: string): { isValid: boolean; error?: string } {
  const pattern = /^BATCH-\d{4}-\d{4}-[A-Z]$/

  if (!batchId) {
    return { isValid: false, error: 'Batch ID is required' }
  }

  if (!pattern.test(batchId)) {
    return { isValid: false, error: 'Batch ID format is invalid. Expected: BATCH-YYYY-MMDD-X' }
  }

  return { isValid: true }
}

/**
 * Validate product name
 */
export function validateProductName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length < 3) {
    return { isValid: false, error: 'Product name must be at least 3 characters long' }
  }

  if (name.length > 200) {
    return { isValid: false, error: 'Product name must not exceed 200 characters' }
  }

  return { isValid: true }
}

/**
 * Validate SKU
 */
export function validateSKU(sku: string): { isValid: boolean; error?: string } {
  const pattern = /^[A-Z0-9\-]{5,20}$/

  if (!sku) {
    return { isValid: false, error: 'SKU is required' }
  }

  if (!pattern.test(sku)) {
    return { isValid: false, error: 'SKU must be 5-20 characters with uppercase letters, numbers, or dashes' }
  }

  return { isValid: true }
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number | string): { isValid: boolean; error?: string } {
  const num = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity

  if (isNaN(num)) {
    return { isValid: false, error: 'Quantity must be a number' }
  }

  if (num <= 0) {
    return { isValid: false, error: 'Quantity must be greater than 0' }
  }

  if (num > 10000000) {
    return { isValid: false, error: 'Quantity cannot exceed 10 million units' }
  }

  return { isValid: true }
}

/**
 * Validate date
 */
export function validateDate(date: string | Date): { isValid: boolean; error?: string } {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return { isValid: false, error: 'Invalid date format' }
  }

  return { isValid: true }
}

/**
 * Validate dosage
 */
export function validateDosage(dosage: string): { isValid: boolean; error?: string } {
  if (!dosage || dosage.trim().length < 2) {
    return { isValid: false, error: 'Dosage is required' }
  }

  if (dosage.length > 100) {
    return { isValid: false, error: 'Dosage must not exceed 100 characters' }
  }

  return { isValid: true }
}

/**
 * Validate phone number (basic)
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  const pattern = /^[\d\s\-\+\(\)]{7,20}$/

  if (!phone) {
    return { isValid: false, error: 'Phone number is required' }
  }

  if (!pattern.test(phone)) {
    return { isValid: false, error: 'Please enter a valid phone number' }
  }

  return { isValid: true }
}

/**
 * Form validation error handler
 */
export function handleValidationError(error: unknown): ValidationError[] {
  if (error instanceof Error) {
    return [{ field: 'general', message: error.message }]
  }

  if (typeof error === 'object' && error !== null) {
    return Object.entries(error).map(([field, message]) => ({
      field,
      message: String(message),
    }))
  }

  return [{ field: 'general', message: 'An error occurred' }]
}

/**
 * Combine multiple field validations
 */
export function validateForm(
  data: Record<string, unknown>,
  validators: Record<string, (value: unknown) => { isValid: boolean; error?: string }>,
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [field, validator] of Object.entries(validators)) {
    const result = validator(data[field])
    if (!result.isValid) {
      errors.push({
        field,
        message: result.error || 'Validation failed',
      })
    }
  }

  return errors
}
