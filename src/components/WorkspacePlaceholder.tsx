type WorkspacePlaceholderProps = {
  title: string;
  description: string;
  isHome?: boolean;
};

export function WorkspacePlaceholder({
  title,
  description,
  isHome = false,
}: WorkspacePlaceholderProps) {
  return (
    <section className="page" aria-labelledby="page-title">
      <div className={`page-intro${isHome ? ' page-intro--home' : ''}`}>
        {isHome ? <span className="page-eyebrow">KORA MEMBERS SELECTION</span> : null}

        <h1 id="page-title">{title}</h1>
        <p>{description}</p>

        {isHome ? (
          <div className="page-intro-decoration" aria-hidden="true" />
        ) : null}
      </div>
    </section>
  );
}