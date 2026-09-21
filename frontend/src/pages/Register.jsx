import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import BrandHeader from '../components/BrandHeader.jsx'
import FormInput from '../components/FormInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const initialForm = {
  full_name: '',
  mobile_number: '',
  email: '',
  village: '',
  password: '',
  confirm_password: '',
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successId, setSuccessId] = useState(null)

  const handleChange = (field) => (event) => {
    let value = event.target.value

    if (field === 'mobile_number') {
      value = value.replace(/\D/g, '').slice(0, 10)
    }

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }))

    setServerError('')
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.full_name.trim()) {
      nextErrors.full_name = 'Full name is required'
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile_number)) {
      nextErrors.mobile_number =
        'Enter a valid 10-digit mobile number'
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address'
    }

    if (!form.village.trim()) {
      nextErrors.village =
        'Village or delivery location is required'
    }

    if (form.password.length < 6) {
      nextErrors.password =
        'Password must be at least 6 characters'
    }

    if (form.confirm_password !== form.password) {
      nextErrors.confirm_password = 'Passwords do not match'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const getErrorMessage = (error) => {
    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(', ')
    }

    return 'Registration failed. Please check your details and try again.'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      const data = await register(form)
      setSuccessId(data.customer_id)
    } catch (error) {
      setServerError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

if (successId) {
  return (
    <main className="auth-page">
      <section className="auth-mobile-shell">
        <BrandHeader
          eyebrow="Welcome to GraminFresh"
          title="Registration Successful"
          subtitle="Your account has been created successfully."
        />

        <div className="auth-form-container">
          <section className="registration-success-card">
            <div className="registration-success-icon">
              ✓
            </div>

            <h2 className="registration-success-title">
              Registration Successful
            </h2>

            <p className="registration-success-description">
              Your account has been created successfully. You can now
              log in using your registered mobile number and password.
            </p>

            <PrimaryButton
              type="button"
              onClick={() => navigate('/login')}
              className="auth-submit-button"
            >
              Continue to Login 
            </PrimaryButton>
          </section>
        </div>
      </section>
    </main>
  )
}

  return (
    <main className="auth-page">
      <section className="auth-mobile-shell">
        <BrandHeader
          eyebrow="Fresh from the village"
          title="Create your account"
          subtitle="Fresh milk, eggs, meat and fish delivered directly from trusted local farms."
        />

        <div className="auth-form-container">
          <section className="auth-glass-card">
            <div className="registration-form-heading">
              <div className="auth-section-heading">
                <span className="auth-section-dot" />

                <p>Join GraminFresh</p>
              </div>

              <h2>Tell us about yourself</h2>

              <p>
                Enter your details to create your customer account.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative z-10"
              noValidate
            >
              <FormInput
                id="full_name"
                label="Full Name"
                placeholder="Your name for delivery"
                value={form.full_name}
                onChange={handleChange('full_name')}
                error={errors.full_name}
                autoComplete="name"
              />

              <FormInput
                id="mobile_number"
                label="Mobile Number"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Mobile number for order updates"
                value={form.mobile_number}
                onChange={handleChange('mobile_number')}
                error={errors.mobile_number}
                autoComplete="tel"
              />

              <FormInput
                id="email"
                label="Email Address"
                type="email"
                placeholder="Email for account notifications"
                value={form.email}
                onChange={handleChange('email')}
                error={errors.email}
                autoComplete="email"
              />

              <FormInput
                id="village"
                label="Village / Location"
                placeholder="Where should we deliver?"
                value={form.village}
                onChange={handleChange('village')}
                error={errors.village}
                autoComplete="address-level2"
              />

              <FormInput
                id="password"
                label="Password"
                type="password"
                placeholder="Create your GraminFresh password"
                value={form.password}
                onChange={handleChange('password')}
                error={errors.password}
                autoComplete="new-password"
              />

              <FormInput
                id="confirm_password"
                label="Confirm Password"
                type="password"
                placeholder="Confirm your GraminFresh password"
                value={form.confirm_password}
                onChange={handleChange('confirm_password')}
                error={errors.confirm_password}
                autoComplete="new-password"
              />

              {serverError && (
                <div className="auth-error" role="alert">
                  {serverError}
                </div>
              )}

              <PrimaryButton
                type="submit"
                loading={loading}
                className="auth-submit-button"
              >
                Create My Account
              </PrimaryButton>

              <p className="auth-bottom-link">
                Already registered?{' '}
                <Link to="/login">
                  Log in
                </Link>
              </p>
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}
