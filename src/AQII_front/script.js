// Navbar scroll effect
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

function selectMode(mode) {
  document.querySelectorAll('.mode-card').forEach(c => c.style.opacity = '0.4');
  const selected = document.querySelector(`.mode-card.${mode === 'scan' ? 'green' : 'blue'}`);
  selected.style.opacity = '1';
  selected.style.transform = 'scale(1.03)';
  setTimeout(() => {
    const target = document.getElementById(mode === 'scan' ? 'predict' : 'comparison');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }, 300);
}

// Try Now button scroll
document.querySelector('.btn-try').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('mode-select').scrollIntoView({ behavior: 'smooth' });
});
