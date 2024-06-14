document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('token-form');
  const botInfoContainer = document.getElementById('bot-info-container');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('token').value;

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Token invalide');
      }

      const botInfo = await response.json();
      displayBotInfo(botInfo);
      localStorage.setItem('discordBotToken', token);
      window.location.href = '/dashboard.html';
    } catch (error) {
      botInfoContainer.innerHTML = `<p>${error.message}</p>`;
    }
  })
