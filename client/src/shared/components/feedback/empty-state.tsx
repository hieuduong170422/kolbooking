interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="feedback feedback--empty">
    <p className="feedback__title">{title}</p>
    {description ? <p className="feedback__description">{description}</p> : null}
  </div>
);
