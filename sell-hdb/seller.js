// Prepare an enquiry locally. The visitor chooses whether to send it in WhatsApp.
const sellerForm = document.querySelector('[data-seller-form]');
if (sellerForm) {
  const sendLink = sellerForm.querySelector('[data-send-sale]');
  function updateSaleEnquiry() {
    const fields = new FormData(sellerForm);
    const message = ["Hi Ammon, I’m thinking of selling my HDB and would like to discuss my options.", '',
      'Block and street: ' + (fields.get('address').trim() || 'I’ll share this when we chat'),
      'Flat type: ' + fields.get('type'),
      'Selling timeline: ' + fields.get('timeline'), '',
      'Please get back to me when you can. Thank you!'].join('\n');
    sendLink.href = 'https://wa.me/6580989441?text=' + encodeURIComponent(message);
  }
  sellerForm.addEventListener('input', updateSaleEnquiry);
  sellerForm.addEventListener('change', updateSaleEnquiry);
  sellerForm.addEventListener('submit', event => event.preventDefault());
  updateSaleEnquiry();
}

// Keep the floating contact button out of the seller enquiry area.
const saleEnquiry = document.querySelector('#sale-enquiry');
const sellerWhatsApp = document.querySelector('.wa-float');
if (saleEnquiry && sellerWhatsApp) {
  let scheduled = false;
  function updateSellerWhatsApp() {
    const navBottom = document.querySelector('nav')?.getBoundingClientRect().bottom || 0;
    sellerWhatsApp.hidden = saleEnquiry.getBoundingClientRect().bottom > navBottom;
    scheduled = false;
  }
  function scheduleSellerWhatsApp() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateSellerWhatsApp);
    }
  }
  window.addEventListener('scroll', scheduleSellerWhatsApp, {passive: true});
  window.addEventListener('resize', scheduleSellerWhatsApp);
  window.addEventListener('pageshow', scheduleSellerWhatsApp);
  new ResizeObserver(scheduleSellerWhatsApp).observe(saleEnquiry);
  updateSellerWhatsApp();
}
