<template>
  <section class="page-content about-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">ABOUT THE GAME</p>
        <h1>Emberfall</h1>
        <p>A growing idle adventure built with the help of AI.</p>
      </div>
    </div>

    <div class="about-layout">
      <article class="about-card">
        <span class="about-icon" aria-hidden="true">E</span>
        <div>
          <p class="eyebrow">INDEPENDENT PROJECT</p>
          <h2>Made one update at a time</h2>
          <p>Battle enemies, gather materials, master professions, trade with players, and build a clan as Emberfall continues to grow.</p>
        </div>
      </article>

      <article class="support-card">
        <div>
          <p class="eyebrow">SUPPORT EMBERFALL</p>
          <h2>Help fund future updates</h2>
          <p class="donation-message">If you like my AI-made slop, I would be grateful to receive donations. I’ll add more content as I get more tokens.</p>
          <small>Donations are optional and do not unlock gameplay advantages.</small>
        </div>

        <a class="paypal-button" href="https://www.paypal.com/donate/?hosted_button_id=GP4P54RVEHDA8" target="_blank" rel="noopener noreferrer"><b aria-hidden="true">P</b> DONATE WITH PAYPAL</a>

        <p class="payment-note">Payments are securely processed by PayPal for <strong>hohlfussasd@gmail.com</strong>.</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.about-page { max-width: 1040px; }
.about-layout { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 14px; }
.about-card, .support-card { border: 1px solid #ffffff14; background: linear-gradient(145deg, #17181b, #0f1114); }
.about-card { min-height: 300px; padding: 32px; display: flex; align-items: flex-start; gap: 24px; }
.about-icon { width: 68px; height: 68px; flex: 0 0 68px; display: grid; place-items: center; border: 1px solid #b7813d; color: #e8b85e; background: #c58a3514; font: 700 34px Cinzel, serif; }
.about-card h2, .support-card h2 { margin: 7px 0 13px; color: #ead2ae; font-size: 25px; }
.about-card > div > p:last-child { margin: 0; color: #8f8b85; font-size: 12px; line-height: 1.7; }
.support-card { padding: 32px; border-color: #72562f; background: radial-gradient(circle at 100% 0, #d2983b18, transparent 45%), linear-gradient(145deg, #191714, #0f1114); }
.donation-message { margin: 0 0 10px; color: #c6bbb0; font-size: 14px; line-height: 1.65; }
.support-card small { color: #7d817b; font-size: 10px; }
.paypal-button { width: 100%; min-height: 48px; margin-top: 25px; display: flex; align-items: center; justify-content: center; border: 1px solid #d9a24b; color: #17120a; background: linear-gradient(#f3c76e, #d9a044); font: 800 11px Cinzel, serif; letter-spacing: .08em; text-decoration: none; cursor: pointer; }
.paypal-button:hover { filter: brightness(1.08); }
.paypal-button b { margin-right: 7px; font-size: 16px; }
.payment-note { margin: 12px 0 0; color: #6f7478; font-size: 9px; line-height: 1.5; text-align: center; }
.payment-note strong { color: #979b9e; font-weight: 600; }
@media (max-width: 720px) {
  .about-layout { grid-template-columns: 1fr; }
  .about-card, .support-card { min-height: 0; padding: 22px; }
  .about-card { display: block; }
  .about-icon { margin-bottom: 20px; }
}
</style>
