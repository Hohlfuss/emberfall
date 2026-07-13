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
          <p class="donation-message">if you like my ai made slop i would be grateful to recieve donations. i will add contens as i get tokens</p>
          <small>Donations are optional and do not unlock gameplay advantages.</small>
        </div>

        <form action="https://www.paypal.com/donate" method="post">
          <input type="hidden" name="business" value="hohlfussasd@gmail.com" />
          <input type="hidden" name="no_recurring" value="0" />
          <input type="hidden" name="item_name" value="Support Emberfall development" />
          <input type="hidden" name="currency_code" value="EUR" />
          <button type="submit"><b aria-hidden="true">P</b> DONATE WITH PAYPAL</button>
        </form>

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
.support-card form { margin-top: 25px; }
.support-card button { width: 100%; min-height: 48px; border: 1px solid #d9a24b; color: #17120a; background: linear-gradient(#f3c76e, #d9a044); font: 800 11px Cinzel, serif; letter-spacing: .08em; cursor: pointer; }
.support-card button:hover { filter: brightness(1.08); }
.support-card button b { margin-right: 7px; font-size: 16px; }
.payment-note { margin: 12px 0 0; color: #6f7478; font-size: 9px; line-height: 1.5; text-align: center; }
.payment-note strong { color: #979b9e; font-weight: 600; }
@media (max-width: 720px) {
  .about-layout { grid-template-columns: 1fr; }
  .about-card, .support-card { min-height: 0; padding: 22px; }
  .about-card { display: block; }
  .about-icon { margin-bottom: 20px; }
}
</style>
