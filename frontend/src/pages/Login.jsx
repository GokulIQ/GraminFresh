import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import BrandHeader from '../components/BrandHeader.jsx'
import FormInput from '../components/FormInput.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import axiosClient from '../api/axiosClient.js'

export default function Login() {
  const {
    sendOtp,
    verifyOtp,
    saveSession,
  } = useAuth()

  const navigate = useNavigate()

  const [mode, setMode] = useState('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [developmentOtp, setDevelopmentOtp] = useState('')

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const validateIdentifier = () => {
    if (identifier.trim().length === 0) {
      return 'Email or Mobile Number is required'
    }

    if (mode === 'otp') {
      if (!/^[6-9]\d{9}$/.test(identifier)) {
        return 'Enter a valid 10-digit mobile number for OTP'
      }
    }

    return ''
  }

  const validate = () => {
    const nextErrors = {}

    const identifierError = validateIdentifier()

    if (identifierError) {
      nextErrors.identifier = identifierError
    }

    if (
      mode === 'password' &&
      password.trim().length === 0
    ) {
      nextErrors.password = 'Password is required'
    }

    if (
      mode === 'otp' &&
      otpSent &&
      !/^\d{6}$/.test(otp)
    ) {
      nextErrors.otp = 'Enter the 6-digit OTP'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const resetMessages = () => {
    setErrors({})
    setServerError('')
    setSuccessMessage('')
    setDevelopmentOtp('')
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setPassword('')
    setOtp('')
    setOtpSent(false)
    resetMessages()
  }

  const getErrorMessage = (error, fallbackMessage) => {
    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(', ')
    }

    return fallbackMessage
  }

  const handlePasswordLogin = async () => {
    const { data } = await axiosClient.post('/api/auth/unified-login', {
      identifier,
      password
    })

    if (data.role === 'admin') {
      localStorage.setItem('vfd_admin_token', data.access_token)
      localStorage.setItem('vfd_admin_user', JSON.stringify(data.admin))
      window.location.href = '/admin/dashboard'
    } else if (data.role === 'delivery') {
      localStorage.setItem('vfd_delivery_token', data.access_token)
      localStorage.setItem('vfd_delivery_partner', JSON.stringify(data.partner))
      window.location.href = '/delivery/dashboard'
    } else {
      saveSession(data)
      navigate('/customer/dashboard', { replace: true })
    }
  }

  const handleSendOtp = async () => {
    const data = await sendOtp(identifier)

    setOtpSent(true)
    setOtp('')
    setSuccessMessage(
      data.message || 'OTP generated successfully'
    )

    if (data.development_otp) {
      setDevelopmentOtp(data.development_otp)
    }
  }

  const handleVerifyOtp = async () => {
    await verifyOtp(identifier, otp)

    navigate('/customer/dashboard', {
      replace: true,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      if (mode === 'password') {
        await handlePasswordLogin()
        return
      }

      if (!otpSent) {
        await handleSendOtp()
        return
      }

      await handleVerifyOtp()
    } catch (error) {
      const fallbackMessage =
        mode === 'password'
          ? 'Login failed. Please check your credentials.'
          : otpSent
            ? 'OTP verification failed. Please try again.'
            : 'Unable to generate OTP. Please try again.'

      setServerError(
        getErrorMessage(error, fallbackMessage)
      )
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    resetMessages()

    const identifierError = validateIdentifier()

    if (identifierError) {
      setErrors({
        identifier: identifierError,
      })
      return
    }

    setLoading(true)

    try {
      await handleSendOtp()
      setSuccessMessage('A new OTP has been generated.')
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          'Unable to resend OTP. Please try again.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

return (
  <main className="auth-page">
    <section className="auth-mobile-shell">
      <BrandHeader
        eyebrow="Welcome back"
        title="Log in to your account"
        subtitle="Track orders and shop fresh farm products."
      />

      <div className="auth-form-container">
        <div className="login-method-tabs">
          <button
            type="button"
            onClick={() => handleModeChange('password')}
            className={mode === 'password' ? 'active' : ''}
          >
            Password
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('otp')}
            className={mode === 'otp' ? 'active' : ''}
          >
            OTP
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FormInput
            id="identifier"
            label={mode === 'password' ? "Email or Mobile Number" : "Mobile Number"}
            type={mode === 'password' ? "text" : "tel"}
            inputMode={mode === 'password' ? "text" : "numeric"}
            maxLength={mode === 'password' ? 255 : 10}
            placeholder={mode === 'password' ? "Enter your email or mobile number" : "Enter your registered mobile number"}
            value={identifier}
            onChange={(event) => {
              let value = event.target.value
              if (mode === 'otp') {
                value = value.replace(/\D/g, '').slice(0, 10)
              }
              setIdentifier(value)

              setErrors((previous) => ({
                ...previous,
                identifier: '',
              }))

              setServerError('')
            }}
            error={errors.identifier}
            autoComplete="username"
            disabled={mode === 'otp' && otpSent}
          />

          {mode === 'password' && (
            <FormInput
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your account password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)

                setErrors((previous) => ({
                  ...previous,
                  password: '',
                }))

                setServerError('')
              }}
              error={errors.password}
              autoComplete="current-password"
            />
          )}

          {mode === 'otp' && !otpSent && (
            <p className="auth-info-message">
              A 6-digit OTP will be generated for your registered
              mobile number.
            </p>
          )}

          {mode === 'otp' && otpSent && (
            <>
              <FormInput
                id="otp"
                label="Enter OTP"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter the 6-digit OTP"
                value={otp}
                onChange={(event) => {
                  const numericValue = event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 6)

                  setOtp(numericValue)

                  setErrors((previous) => ({
                    ...previous,
                    otp: '',
                  }))

                  setServerError('')
                }}
                error={errors.otp}
                autoComplete="one-time-code"
              />

              <div className="otp-action-row">
                <button
                  type="button"
                  className="otp-secondary-button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    resetMessages()
                  }}
                >
                  Change Number
                </button>

                <button
                  type="button"
                  className="otp-primary-button"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {successMessage && (
            <div className="auth-success" role="status">
              {successMessage}
            </div>
          )}

          {developmentOtp && (
            <div className="development-otp-card">
              <p>Development OTP</p>
              <strong>{developmentOtp}</strong>
            </div>
          )}

          {serverError && (
            <div className="auth-error" role="alert">
              {serverError}
            </div>
          )}

          {mode === 'password' && (
            <Link
              to="/forgot-password"
              className="forgot-password-link"
            >
              Forgot Password?
            </Link>
          )}

          <PrimaryButton
            type="submit"
            loading={loading}
            className="auth-submit-button"
          >
            {mode === 'password'
              ? 'Log In'
              : otpSent
                ? 'Verify OTP'
                : 'Send OTP'}
          </PrimaryButton>

          <p className="auth-bottom-link">
            New here?{' '}
            <Link to="/register">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </section>
  </main>
)
}
