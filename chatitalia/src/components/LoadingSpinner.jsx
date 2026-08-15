import React from 'react'

function LoadingSpinner({ size = 20, stroke = 3, color = '#fff', ariaLabel = 'Carregando' }) {
  const viewBox = 24
  const radius = (viewBox - stroke) / 2
  const cx = viewBox / 2
  const cy = viewBox / 2

  return (
    <span className="loading-spinner" role="status" aria-label={ariaLabel}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * 2 * radius * 0.75} ${Math.PI * 2 * radius}`}
          strokeDashoffset="0"
        />
      </svg>
    </span>
  )
}

export default LoadingSpinner
