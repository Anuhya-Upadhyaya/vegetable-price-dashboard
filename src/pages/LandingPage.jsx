
import { Link } from "react-router-dom";
import "./LandingPage.css";

const features = [
  {
    number: "01",
    icon: "🥬",
    title: "Daily vegetable prices",
    description:
      "Enter and maintain daily prices for vegetables such as onion, potato, garlic, ginger and lemon.",
  },
  {
    number: "02",
    icon: "📈",
    title: "Price trend monitoring",
    description:
      "Review price changes over time and understand how current prices compare with earlier entries.",
  },
  {
    number: "03",
    icon: "🛡️",
    title: "Role-based access",
    description:
      "Separate user and administrator workflows so each role can access the appropriate tools.",
  },
  {
    number: "04",
    icon: "📊",
    title: "Centralized dashboard",
    description:
      "Bring vegetable price information together in one application for easier monitoring and management.",
  },
];

function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="Veegronex home">
          <span className="brand-mark">V</span>
          <span>
            <strong>VEEGRONEX</strong>
            <small>GLOBAL TRADE</small>
          </span>
        </Link>

        <nav className="landing-nav-links">
          <a href="#about">About</a>
          <a href="#freshflow">FreshFlow</a>
          <a href="#features">Features</a>
          <a href="#workflow">How it works</a>
        </nav>

        <Link className="landing-login" to="/login">
          Login <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="landing-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" />
            VEGETABLE PRICE INTELLIGENCE
          </div>

          <h1>
            Fresh insights.
            <br />
            <span>Smarter decisions.</span>
          </h1>

          <p className="hero-description">
            Introducing FreshFlow by Veegronex Global Trade — a centralized
            platform for recording daily vegetable prices, monitoring trends,
            and managing price information with clarity.
          </p>

          <div className="hero-actions">
            <Link className="button-primary" to="/login">
              Enter FreshFlow <span aria-hidden="true">→</span>
            </Link>
            <a className="button-secondary" href="#about">
              Discover our platform
            </a>
          </div>

          <div className="hero-caption">
            <span className="caption-line" />
            A clearer view of everyday vegetable prices.
          </div>
        </div>

        <div className="hero-visual" aria-label="Illustration of price analytics">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <div className="floating-leaf leaf-one">🌿</div>
          <div className="floating-leaf leaf-two">🥬</div>
          <div className="floating-leaf leaf-three">🍋</div>

          <div className="price-card price-card-main">
            <div className="price-card-heading">
              <span className="mini-icon">✳</span>
              <span>FreshFlow overview</span>
              <span className="live-label">LIVE UI</span>
            </div>

            <div className="price-card-title">Vegetable price trends</div>
            <div className="chart-caption">
              Illustrative trend visualization
            </div>

            <svg
              className="hero-chart"
              viewBox="0 0 340 130"
              role="img"
              aria-label="Decorative rising and falling trend line"
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9ee8a8" stopOpacity=".38" />
                  <stop offset="100%" stopColor="#9ee8a8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 100 C30 90 35 105 60 78 S100 85 125 58 S165 70 190 43 S235 58 260 30 S310 42 340 12 L340 130 L0 130 Z"
                fill="url(#chartFill)"
              />
              <path
                className="chart-line"
                d="M0 100 C30 90 35 105 60 78 S100 85 125 58 S165 70 190 43 S235 58 260 30 S310 42 340 12"
                fill="none"
                stroke="#74c983"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="260" cy="30" r="5" fill="#d7f5c8" />
            </svg>

            <div className="chart-legend">
              <span><i /> Price movement</span>
              <span>Demo visual</span>
            </div>
          </div>

          <div className="price-card price-card-small">
            <span className="small-card-icon">🥦</span>
            <div>
              <strong>Price tracking</strong>
              <small>Daily entries in one place</small>
            </div>
            <span className="small-card-arrow">↗</span>
          </div>

          <div className="visual-note">
            <span className="visual-note-icon">✦</span>
            <span>From daily entries to clearer insights</span>
          </div>
        </div>

        <a className="scroll-cue" href="#about">
          <span className="scroll-cue-line" />
          SCROLL TO EXPLORE
        </a>
      </section>

      <section className="landing-about section-reveal" id="about">
        <div className="section-kicker">01 / ABOUT VEEGRONEX</div>
        <div className="about-grid">
          <h2>
            Connecting daily operations with
            <span> better visibility.</span>
          </h2>
          <div>
            <p>
              Veegronex Global Trade is the company context behind this
              vegetable price management application. FreshFlow is designed
              to help its team organize daily vegetable price information
              and make that information easier to review.
            </p>
            <p className="muted-copy">
              This page introduces the company and explains the purpose of
              the application. Add verified company history, services,
              address and contact information here before publishing.
            </p>
          </div>
        </div>
      </section>

      <section className="freshflow-section section-reveal" id="freshflow">
        <div className="freshflow-orb" />
        <div className="section-kicker">02 / MEET FRESHFLOW</div>
        <div className="freshflow-grid">
          <div>
            <h2>
              Vegetable prices,
              <br />
              <span>organized in one place.</span>
            </h2>
            <p>
              FreshFlow is a vegetable price dashboard built to record
              daily prices, support role-based workflows, and help
              administrators review price movements.
            </p>
            <Link className="text-link" to="/login">
              Open the application <span>→</span>
            </Link>
          </div>

          <div className="vegetable-showcase" aria-hidden="true">
            <span className="veggie veggie-one">🧅</span>
            <span className="veggie veggie-two">🥔</span>
            <span className="veggie veggie-three">🧄</span>
            <span className="veggie veggie-four">🫚</span>
            <span className="veggie veggie-five">🍋</span>
            <div className="showcase-ring" />
            <div className="showcase-label">DAILY PRICE DATA</div>
          </div>
        </div>
      </section>

      <section className="features-section section-reveal" id="features">
        <div className="section-kicker">03 / WHAT THE PLATFORM DOES</div>
        <div className="section-heading-row">
          <h2>Built around your daily workflow.</h2>
          <p>
            A focused set of tools for entering, reviewing and managing
            vegetable price information.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-topline">
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-number">{feature.number}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="feature-decoration">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section section-reveal" id="workflow">
        <div className="section-kicker">04 / HOW IT WORKS</div>
        <h2>From entry to overview.</h2>

        <div className="workflow-grid">
          <article>
            <span className="workflow-number">01</span>
            <h3>Sign in</h3>
            <p>Open the login page and use your authorized account and role.</p>
          </article>
          <article>
            <span className="workflow-number">02</span>
            <h3>Record prices</h3>
            <p>Users enter vegetable price information through the application.</p>
          </article>
          <article>
            <span className="workflow-number">03</span>
            <h3>Review trends</h3>
            <p>Administrators review recorded prices and available analytics.</p>
          </article>
        </div>
      </section>

      <section className="landing-cta section-reveal">
        <span className="cta-sparkle">✳</span>
        <div className="section-kicker">READY TO GET STARTED?</div>
        <h2>Bring your daily price workflow into focus.</h2>
        <p>Sign in to access the FreshFlow application.</p>
        <Link className="button-primary" to="/login">
          Login to FreshFlow <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand footer-brand" to="/">
          <span className="brand-mark">V</span>
          <span>
            <strong>VEEGRONEX</strong>
            <small>GLOBAL TRADE</small>
          </span>
        </Link>
        <span>FreshFlow · Vegetable Price Dashboard</span>
        <a href="#top" onClick={(event) => {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>
          Back to top ↑
        </a>
      </footer>
    </main>
  );
}

export default LandingPage;
