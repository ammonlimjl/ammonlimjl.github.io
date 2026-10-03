// Keep the floating contact button out of the buyer enquiry area.
const buyerEnquiry = document.querySelector('#shortlist');
const buyerWhatsApp = document.querySelector('.wa-float');
if (buyerEnquiry && buyerWhatsApp) {
  let scheduled = false;
  function updateBuyerWhatsApp() {
    const navBottom = document.querySelector('nav')?.getBoundingClientRect().bottom || 0;
    buyerWhatsApp.hidden = buyerEnquiry.getBoundingClientRect().bottom > navBottom;
    scheduled = false;
  }
  function scheduleBuyerWhatsApp() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateBuyerWhatsApp);
    }
  }
  window.addEventListener('scroll', scheduleBuyerWhatsApp, {passive: true});
  window.addEventListener('resize', scheduleBuyerWhatsApp);
  window.addEventListener('pageshow', scheduleBuyerWhatsApp);
  new ResizeObserver(scheduleBuyerWhatsApp).observe(buyerEnquiry);
  updateBuyerWhatsApp();
}
