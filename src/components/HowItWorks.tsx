import Link from "next/link";

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick your lounge",
      text: "Choose city and branch so we prepare from the right kitchen.",
    },
    {
      n: "02",
      title: "Build your box",
      text: "Add cakes, brownies, cupcakes and more — change qty anytime.",
    },
    {
      n: "03",
      title: "Pickup or delivery",
      text: "Checkout in seconds. Free delivery unlocks above the threshold.",
    },
  ];

  return (
    <section className="lz-how">
      <div className="lz-how-inner">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Easy ordering</p>
            <h2>Three steps to Ir-Rezistable</h2>
          </div>
          <Link className="text-link" href="/menu">
            Start now →
          </Link>
        </div>
        <ol className="lz-how-grid">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="lz-how-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
