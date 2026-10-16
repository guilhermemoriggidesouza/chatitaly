// Lista de vantagens de um plano, com o ícone de check.
function PlanFeatureList({ items }) {
  return (
    <ul className="plans-features">
      {items.map((item) => (
        <li key={item}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default PlanFeatureList
