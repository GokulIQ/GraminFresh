import { useState } from 'react'
import { Link } from 'react-router-dom'

import BrandHeader from '../components/BrandHeader.jsx'
import FormInput from '../components/FormInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'

export default function ForgotPassword() {
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleMobileChange = (event) => {
    const numericValue = event.target.value
      .replace(/\D/g, '')
      .slice(0, 10)

    setMobile(numericValue)
    setError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setError('')
    setSent(true)
  }

  return (
    <main className="auth-page">
      <section className="auth-mobile-shell">
        <BrandHeader
          eyebrow="Account recovery"
          title="Reset your password"
          subtitle="Enter your registered mobile number and we'll send you reset instructions."
        />

        <div className="auth-form-container">
          {sent ? (
            <div className="forgot-password-success">
              <div
                className="forgot-success-icon"
                aria-hidden="true"
              >
                ✓
              </div>

              <h2>Request received</h2>

              <p>
                If{' '}
                <strong>
                  +91 {mobile}
                </strong>{' '}
                is registered, reset instructions have been sent.
              </p>

              <p className="forgot-feature-note">
                This feature is currently being finalized and
                will be available in an upcoming release.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <FormInput
                id="mobile"
                label="Mobile Number"
                prefix="+91"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter your registered mobile number"
                value={mobile}
                onChange={handleMobileChange}
                error={error}
                autoComplete="tel"
              />

              <PrimaryButton
                type="submit"
                className="auth-submit-button"
              >
                Send Reset Instructions
              </PrimaryButton>
            </form>
          )}

          <p className="auth-bottom-link">
            <Link to="/login">
              ← Back to Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}