import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("RuNSee frontend error boundary", error);
  }

  handleReload() {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page premium-page">
          <div className="container">
            <section className="card section">
              <h1 className="card-title">Une erreur est survenue</h1>
              <p className="card-subtitle">L'application a intercepté un plantage de rendu pour éviter une page blanche.</p>
              <div className="alert alert-error top-gap-sm">
                Recharge la page. Si le problème persiste, vérifie les données chargées ou la dernière action effectuée.
              </div>
              <div className="actions-row top-gap-sm">
                <button type="button" className="button button-primary" onClick={() => this.handleReload()}>
                  Recharger l'application
                </button>
              </div>
            </section>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
