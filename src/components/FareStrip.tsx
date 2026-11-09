export function FareStrip({
  from,
  to,
  detail,
  amount,
}: {
  from: string;
  to: string;
  detail: string;
  amount: string;
}) {
  return (
    <div className="fare-strip">
      <div className="fare-main">
        <p className="label">From the plan</p>
        <div className="fare-route">
          <span>{from}</span>
          <span className="fare-line" aria-hidden="true" />
          <span>{to}</span>
        </div>
        <p className="mt-3 leading-6">{detail}</p>
      </div>
      <div className="fare-stub">
        <p className="label">Cap</p>
        <p className="fare-amount">{amount}</p>
      </div>
    </div>
  );
}
