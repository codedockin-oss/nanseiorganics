// Fix for product page loading issue
document.addEventListener('DOMContentLoaded', function() {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  console.log('Loading product ID:', productId);
  
  // If no ID provided, redirect to index
  if (!productId) {
    console.log('No product ID found, redirecting to index');
    window.location.href = 'index.html';
    return;
  }
  
  // Ensure the loadProduct function is called
  if (typeof loadProduct === 'function') {
    console.log('Calling loadProduct function');
    loadProduct();
  } else {
    console.error('loadProduct function not found');
    // Fallback: redirect to index with a delay
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
});