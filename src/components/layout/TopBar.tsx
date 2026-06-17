interface Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: Props) {
  return (
    <header
      style={{
        height: 56,
        background: '#ffffff',
        borderBottom: '1px solid #eeeeee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#222222',
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              color: '#999999',
              margin: '3px 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  )
}
